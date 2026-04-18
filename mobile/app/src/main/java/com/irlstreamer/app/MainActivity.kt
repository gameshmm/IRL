package com.irlstreamer.app

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.SurfaceHolder
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.irlstreamer.app.databinding.ActivityMainBinding
import com.pedro.encoder.input.video.CameraHelper
import com.pedro.common.ConnectChecker
import com.pedro.library.rtmp.RtmpCamera2
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity(), ConnectChecker, SurfaceHolder.Callback {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: StreamPreferences
    private var rtmpCamera: RtmpCamera2? = null

    // State
    private var isStreaming = false
    private var reconnectAttempts = 0
    private val maxReconnectAttempts = 10
    private var reconnectJob: kotlinx.coroutines.Job? = null

    // Adaptive bitrate config
    private val maxBitrate = 4000 * 1024  // 4 Mbps
    private val minBitrate = 500 * 1024   // 500 kbps
    private var currentBitrate = 2000 * 1024 // Start at 2 Mbps

    // Permissions launcher
    private val permissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        if (results.all { it.value }) {
            initCamera()
        } else {
            showToast("Permissões de câmera e microfone são necessárias!")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = StreamPreferences(this)

        setupUI()
        checkPermissions()
    }

    private fun setupUI() {
        // Load saved preferences into fields
        binding.etServerUrl.setText(prefs.serverUrl)
        binding.etStreamKey.setText(prefs.streamKey)
        binding.tvBitrateValue.text = "${currentBitrate / 1024} kbps"

        // Surface holder for camera preview
        binding.surfaceView.holder.addCallback(this)

        // Go Live button
        binding.btnGoLive.setOnClickListener {
            if (!isStreaming) startStream() else stopStream()
        }

        // Flip camera
        binding.btnFlipCamera.setOnClickListener {
            rtmpCamera?.switchCamera()
        }

        // Toggle torch
        binding.btnTorch.setOnClickListener {
            rtmpCamera?.let {
                if (it.isLanternEnabled) {
                    it.disableLantern()
                    binding.btnTorch.alpha = 0.5f
                } else {
                    it.enableLantern()
                    binding.btnTorch.alpha = 1.0f
                }
            }
        }

        // Settings
        binding.btnSettings.setOnClickListener {
            startActivity(android.content.Intent(this, SettingsActivity::class.java))
        }

        // Bitrate slider
        binding.sliderBitrate.addOnChangeListener { _, value, _ ->
            currentBitrate = value.toInt() * 1024
            binding.tvBitrateValue.text = "${value.toInt()} kbps"
            if (isStreaming) rtmpCamera?.setVideoBitrateOnFly(currentBitrate)
        }
    }

    private fun checkPermissions() {
        val permissions = arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
        val allGranted = permissions.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
        if (allGranted) initCamera() else permissionsLauncher.launch(permissions)
    }

    private fun initCamera() {
        rtmpCamera = RtmpCamera2(binding.surfaceView, this)
    }

    private fun startStream() {
        val serverUrl = binding.etServerUrl.text.toString().trim()
        val streamKey = binding.etStreamKey.text.toString().trim()

        if (serverUrl.isEmpty() || streamKey.isEmpty()) {
            showToast("Preencha o endereço do servidor e a chave de stream")
            return
        }

        // Save preferences
        prefs.serverUrl = serverUrl
        prefs.streamKey = streamKey

        val rtmpUrl = buildRtmpUrl(serverUrl, streamKey)

        try {
            if (rtmpCamera?.prepareAudio(
                    128 * 1024,  // 128 kbps audio
                    44100,        // sample rate
                    true          // stereo
                ) == true &&
                rtmpCamera?.prepareVideo(
                    1280, 720,    // 720p
                    30,           // FPS
                    currentBitrate,
                    1,            // 1 = BACK, 0 = FRONT
                    0             // rotation
                ) == true
            ) {
                rtmpCamera?.startStream(rtmpUrl)
                setStreamingState(true)
                reconnectAttempts = 0
                updateStatusText("Conectando...", Color.YELLOW)
            } else {
                showToast("Erro ao preparar câmera/áudio")
            }
        } catch (e: Exception) {
            showToast("Erro: ${e.message}")
        }
    }

    private fun stopStream() {
        reconnectJob?.cancel()
        rtmpCamera?.stopStream()
        setStreamingState(false)
        reconnectAttempts = 0
        updateStatusText("Offline", Color.GRAY)
    }

    private fun setStreamingState(streaming: Boolean) {
        isStreaming = streaming
        runOnUiThread {
            binding.btnGoLive.text = if (streaming) "⬛  ENCERRAR LIVE" else "🔴  IR AO VIVO"
            binding.btnGoLive.setBackgroundColor(
                if (streaming) Color.parseColor("#1a1a1a") else Color.parseColor("#FF4757")
            )
            binding.liveBadge.visibility = if (streaming) View.VISIBLE else View.GONE
            binding.etServerUrl.isEnabled = !streaming
            binding.etStreamKey.isEnabled = !streaming
        }
    }

    private fun attemptReconnect() {
        reconnectJob?.cancel()
        reconnectJob = lifecycleScope.launch {
            if (reconnectAttempts < maxReconnectAttempts && isStreaming) {
                reconnectAttempts++
                val delayMs = (reconnectAttempts * 3000L).coerceAtMost(30000L)
                updateStatusText("Reconectando em ${delayMs / 1000}s... (${reconnectAttempts}/$maxReconnectAttempts)", Color.YELLOW)
                delay(delayMs)

                withContext(Dispatchers.Main) {
                    if (isStreaming) {
                        val serverUrl = binding.etServerUrl.text.toString().trim()
                        val streamKey = binding.etStreamKey.text.toString().trim()
                        val rtmpUrl = buildRtmpUrl(serverUrl, streamKey)
                        rtmpCamera?.startStream(rtmpUrl)
                    }
                }
            } else {
                stopStream()
                updateStatusText("Reconexão falhou", Color.RED)
                showToast("Não foi possível reconectar ao servidor")
            }
        }
    }

    private fun buildRtmpUrl(server: String, key: String): String {
        val cleanServer = server.removePrefix("rtmp://").removeSuffix("/")
        return "rtmp://$cleanServer:1935/live/$key"
    }

    private fun updateStatusText(text: String, color: Int) {
        runOnUiThread {
            binding.tvStatus.text = text
            binding.tvStatus.setTextColor(color)
        }
    }

    private fun showToast(msg: String) {
        runOnUiThread { Toast.makeText(this, msg, Toast.LENGTH_SHORT).show() }
    }

    // ─── ConnectChecker callbacks ─────────────────────────────────────────

    override fun onConnectionStarted(url: String) {
        updateStatusText("Iniciando...", Color.YELLOW)
    }

    override fun onConnectionSuccess() {
        runOnUiThread {
            updateStatusText("🔴 AO VIVO", Color.parseColor("#FF4757"))
            reconnectAttempts = 0
        }
    }

    override fun onConnectionFailed(reason: String) {
        updateStatusText("Falhou: $reason", Color.RED)
        if (isStreaming) attemptReconnect()
    }

    override fun onNewBitrate(bitrate: Long) {
        // Adaptive bitrate: reduce quality on poor connection
        runOnUiThread {
            binding.tvStatus.text = "🔴 AO VIVO · ${bitrate / 1024} kbps"
        }
    }

    override fun onDisconnect() {
        updateStatusText("Desconectado", Color.YELLOW)
        if (isStreaming) attemptReconnect()
    }

    override fun onAuthError() {
        updateStatusText("Erro de autenticação! Verifique a chave.", Color.RED)
        stopStream()
        showToast("Chave de stream inválida ou não autorizada")
    }

    override fun onAuthSuccess() {
        updateStatusText("Autenticado ✓", Color.GREEN)
    }

    // ─── SurfaceHolder callbacks ──────────────────────────────────────────────

    override fun surfaceCreated(holder: SurfaceHolder) {
        rtmpCamera?.startPreview(CameraHelper.Facing.BACK)
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {}

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        rtmpCamera?.stopPreview()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopStream()
        rtmpCamera?.stopPreview()
    }
}
