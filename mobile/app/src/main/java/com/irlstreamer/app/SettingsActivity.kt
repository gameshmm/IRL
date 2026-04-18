package com.irlstreamer.app

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.irlstreamer.app.databinding.ActivitySettingsBinding

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private lateinit var prefs: StreamPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.apply {
            title = "Configurações"
            setDisplayHomeAsUpEnabled(true)
        }

        prefs = StreamPreferences(this)
        loadPrefs()

        binding.btnSave.setOnClickListener { savePrefs() }
    }

    private fun loadPrefs() {
        binding.etServerUrl.setText(prefs.serverUrl)
        binding.etStreamKey.setText(prefs.streamKey)
        binding.sliderBitrate.value = prefs.videoBitrate.toFloat()
        binding.tvBitrateValue.text = "${prefs.videoBitrate} kbps"
        binding.switchAdaptive.isChecked = prefs.adaptiveBitrate
        binding.switchAutoReconnect.isChecked = prefs.autoReconnect

        // Resolution spinner
        val resOptions = arrayOf("640x480", "1280x720", "1920x1080")
        val resIdx = resOptions.indexOf(prefs.videoResolution).takeIf { it >= 0 } ?: 1
        binding.spinnerResolution.setSelection(resIdx)

        // FPS spinner
        val fpsOptions = arrayOf("24", "30", "60")
        val fpsIdx = fpsOptions.indexOf(prefs.videoFps.toString()).takeIf { it >= 0 } ?: 1
        binding.spinnerFps.setSelection(fpsIdx)

        binding.sliderBitrate.addOnChangeListener { _, value, _ ->
            binding.tvBitrateValue.text = "${value.toInt()} kbps"
        }
    }

    private fun savePrefs() {
        val serverUrl = binding.etServerUrl.text.toString().trim()
        val streamKey = binding.etStreamKey.text.toString().trim()

        if (serverUrl.isEmpty()) {
            binding.etServerUrl.error = "Informe o endereço do servidor"
            return
        }

        prefs.serverUrl = serverUrl
        prefs.streamKey = streamKey
        prefs.videoBitrate = binding.sliderBitrate.value.toInt()
        prefs.adaptiveBitrate = binding.switchAdaptive.isChecked
        prefs.autoReconnect = binding.switchAutoReconnect.isChecked

        val resOptions = arrayOf("640x480", "1280x720", "1920x1080")
        prefs.videoResolution = resOptions[binding.spinnerResolution.selectedItemPosition]

        val fpsOptions = arrayOf(24, 30, 60)
        prefs.videoFps = fpsOptions[binding.spinnerFps.selectedItemPosition]

        android.widget.Toast.makeText(this, "Configurações salvas!", android.widget.Toast.LENGTH_SHORT).show()
        finish()
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressedDispatcher.onBackPressed()
        return true
    }
}
