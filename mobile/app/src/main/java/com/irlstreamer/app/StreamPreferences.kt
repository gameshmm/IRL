package com.irlstreamer.app

import android.content.Context
import android.content.SharedPreferences

class StreamPreferences(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("irl_prefs", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = prefs.getString("server_url", "192.168.1.100") ?: "192.168.1.100"
        set(value) = prefs.edit().putString("server_url", value).apply()

    var streamKey: String
        get() = prefs.getString("stream_key", "") ?: ""
        set(value) = prefs.edit().putString("stream_key", value).apply()

    var videoBitrate: Int
        get() = prefs.getInt("video_bitrate", 2000)
        set(value) = prefs.edit().putInt("video_bitrate", value).apply()

    var videoResolution: String
        get() = prefs.getString("video_resolution", "1280x720") ?: "1280x720"
        set(value) = prefs.edit().putString("video_resolution", value).apply()

    var videoFps: Int
        get() = prefs.getInt("video_fps", 30)
        set(value) = prefs.edit().putInt("video_fps", value).apply()

    var audioBitrate: Int
        get() = prefs.getInt("audio_bitrate", 128)
        set(value) = prefs.edit().putInt("audio_bitrate", value).apply()

    var adaptiveBitrate: Boolean
        get() = prefs.getBoolean("adaptive_bitrate", true)
        set(value) = prefs.edit().putBoolean("adaptive_bitrate", value).apply()

    var autoReconnect: Boolean
        get() = prefs.getBoolean("auto_reconnect", true)
        set(value) = prefs.edit().putBoolean("auto_reconnect", value).apply()
}
