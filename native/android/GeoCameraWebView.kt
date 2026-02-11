// GeoCameraWebView.kt
// Android WebView 참조 구현 - Kotlin 프로젝트에 통합하여 사용

package com.example.geocamera

import android.Manifest
import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.location.Geocoder
import android.location.Location
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.util.Base64
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import org.json.JSONObject
import java.util.*

class GeoCameraActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var pendingLocationRequestId: String? = null

    // Vercel 배포 URL (배포 후 수정)
    private val webAppUrl = "https://geocamera.vercel.app"

    companion object {
        private const val PERMISSION_REQUEST_CODE = 1001
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION,
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        if (hasPermissions()) {
            setupWebView()
        } else {
            requestPermissions()
        }
    }

    // MARK: - Permissions

    private fun hasPermissions(): Boolean {
        return REQUIRED_PERMISSIONS.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun requestPermissions() {
        ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, PERMISSION_REQUEST_CODE)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE && hasPermissions()) {
            setupWebView()
        }
    }

    // MARK: - WebView Setup

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.cacheMode = WebSettings.LOAD_DEFAULT

            // JavaScript Bridge 등록
            addJavascriptInterface(
                GeoCameraBridge(this@GeoCameraActivity, this),
                "GeoCameraAndroid"
            )

            // 카메라 권한 허용
            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest) {
                    runOnUiThread {
                        request.grant(request.resources)
                    }
                }
            }

            webViewClient = WebViewClient()
        }

        setContentView(webView)
        webView.loadUrl(webAppUrl)
    }

    // MARK: - Location

    @SuppressLint("MissingPermission")
    fun requestLocation(requestId: String) {
        pendingLocationRequestId = requestId

        fusedLocationClient.lastLocation
            .addOnSuccessListener { location: Location? ->
                if (location != null) {
                    sendLocationToWeb(requestId, location)
                } else {
                    // lastLocation이 null이면 새로 요청
                    val request = LocationRequest.Builder(
                        Priority.PRIORITY_HIGH_ACCURACY, 5000
                    ).setMaxUpdates(1).build()

                    fusedLocationClient.requestLocationUpdates(
                        request,
                        object : LocationCallback() {
                            override fun onLocationResult(result: LocationResult) {
                                result.lastLocation?.let { loc ->
                                    sendLocationToWeb(requestId, loc)
                                }
                                fusedLocationClient.removeLocationUpdates(this)
                            }
                        },
                        mainLooper
                    )
                }
            }
    }

    private fun sendLocationToWeb(requestId: String, location: Location) {
        var address = "${location.latitude}, ${location.longitude}"

        try {
            @Suppress("DEPRECATION")
            val addresses = Geocoder(this, Locale.KOREA)
                .getFromLocation(location.latitude, location.longitude, 1)

            if (!addresses.isNullOrEmpty()) {
                val addr = addresses[0]
                val components = listOfNotNull(
                    addr.adminArea,
                    addr.locality,
                    addr.subLocality,
                    addr.thoroughfare,
                    addr.subThoroughfare
                )
                if (components.isNotEmpty()) {
                    address = components.joinToString(" ")
                }
            }
        } catch (_: Exception) {
            // Geocoder 실패 시 좌표 사용
        }

        val json = JSONObject().apply {
            put("requestId", requestId)
            put("latitude", location.latitude)
            put("longitude", location.longitude)
            put("address", address)
            put("timestamp", System.currentTimeMillis())
        }

        val escaped = json.toString().replace("'", "\\'")
        runOnUiThread {
            webView.evaluateJavascript(
                "window.GeoCameraCallback.onLocation('$escaped')", null
            )
        }
    }

    // MARK: - Photo Save

    fun savePhotoToGallery(dataUrl: String, filename: String): Boolean {
        return try {
            val base64 = dataUrl.substringAfter(",")
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return false

            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, filename)
                put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/GeoCamera")
                }
            }

            val uri = contentResolver.insert(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values
            ) ?: return false

            contentResolver.openOutputStream(uri)?.use { stream ->
                bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 92, stream)
            }

            runOnUiThread {
                webView.evaluateJavascript(
                    "window.GeoCameraCallback.onPhotoSaved(true)", null
                )
            }
            true
        } catch (_: Exception) {
            runOnUiThread {
                webView.evaluateJavascript(
                    "window.GeoCameraCallback.onPhotoSaved(false)", null
                )
            }
            false
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }
}

// MARK: - JavaScript Interface

class GeoCameraBridge(
    private val activity: GeoCameraActivity,
    private val webView: WebView
) {
    @JavascriptInterface
    fun requestLocation(payloadJson: String) {
        val payload = JSONObject(payloadJson)
        val requestId = payload.optString("requestId", "")
        activity.requestLocation(requestId)
    }

    @JavascriptInterface
    fun savePhoto(dataUrl: String, filename: String) {
        activity.savePhotoToGallery(dataUrl, filename)
    }
}

// MARK: - AndroidManifest.xml에 추가 필요:
// <uses-permission android:name="android.permission.CAMERA" />
// <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
// <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
