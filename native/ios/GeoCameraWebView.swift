// GeoCameraWebView.swift
// iOS WKWebView 참조 구현 - Swift 프로젝트에 통합하여 사용

import UIKit
import WebKit
import CoreLocation

class GeoCameraViewController: UIViewController {

    private var webView: WKWebView!
    private let locationManager = CLLocationManager()
    private let geocoder = CLGeocoder()
    private var pendingLocationRequestId: String?

    // MARK: - Vercel 배포 URL (배포 후 수정)
    private let webAppURL = "https://geocamera.vercel.app"

    override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
        setupLocationManager()
        loadWebApp()
    }

    // MARK: - WebView Setup

    private func setupWebView() {
        let config = WKWebViewConfiguration()

        // 카메라 인라인 재생 필수
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        // JavaScript Bridge 등록
        config.userContentController.add(self, name: "geocamera")

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.scrollView.isScrollEnabled = false
        webView.isOpaque = false
        webView.backgroundColor = .black

        view.addSubview(webView)
    }

    private func setupLocationManager() {
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
    }

    private func loadWebApp() {
        guard let url = URL(string: webAppURL) else { return }
        webView.load(URLRequest(url: url))
    }

    // MARK: - Location → Web

    private func sendLocationToWeb(requestId: String, location: CLLocation) {
        geocoder.reverseGeocodeLocation(location) { [weak self] placemarks, error in
            guard let self = self else { return }

            var address = "주소를 확인할 수 없습니다"
            if let placemark = placemarks?.first {
                let components = [
                    placemark.administrativeArea,
                    placemark.locality,
                    placemark.subLocality,
                    placemark.thoroughfare,
                    placemark.subThoroughfare
                ].compactMap { $0 }
                address = components.joined(separator: " ")
            }

            let json: [String: Any] = [
                "requestId": requestId,
                "latitude": location.coordinate.latitude,
                "longitude": location.coordinate.longitude,
                "address": address,
                "timestamp": Date().timeIntervalSince1970 * 1000
            ]

            guard let jsonData = try? JSONSerialization.data(withJSONObject: json),
                  let jsonString = String(data: jsonData, encoding: .utf8) else { return }

            DispatchQueue.main.async {
                self.webView.evaluateJavaScript(
                    "window.GeoCameraCallback.onLocation('\(jsonString.replacingOccurrences(of: "'", with: "\\'"))')"
                )
            }
        }
    }

    // MARK: - Photo Save

    private func savePhotoToGallery(dataUrl: String) {
        guard let base64String = dataUrl.components(separatedBy: ",").last,
              let imageData = Data(base64Encoded: base64String),
              let image = UIImage(data: imageData) else {
            sendPhotoSavedCallback(success: false)
            return
        }

        UIImageWriteToSavedPhotosAlbum(image, self, #selector(imageSaved(_:didFinishSavingWithError:contextInfo:)), nil)
    }

    @objc private func imageSaved(_ image: UIImage, didFinishSavingWithError error: Error?, contextInfo: UnsafeRawPointer) {
        sendPhotoSavedCallback(success: error == nil)
    }

    private func sendPhotoSavedCallback(success: Bool) {
        DispatchQueue.main.async {
            self.webView.evaluateJavaScript(
                "window.GeoCameraCallback.onPhotoSaved(\(success))"
            )
        }
    }
}

// MARK: - WKScriptMessageHandler

extension GeoCameraViewController: WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }

        switch action {
        case "requestLocation":
            let requestId = body["requestId"] as? String ?? ""
            pendingLocationRequestId = requestId
            locationManager.requestWhenInUseAuthorization()
            locationManager.requestLocation()

        case "savePhoto":
            if let dataUrl = body["dataUrl"] as? String {
                savePhotoToGallery(dataUrl: dataUrl)
            }

        default:
            break
        }
    }
}

// MARK: - WKUIDelegate (카메라 권한)

extension GeoCameraViewController: WKUIDelegate {
    @available(iOS 15.0, *)
    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        decisionHandler(.grant)
    }
}

// MARK: - WKNavigationDelegate

extension GeoCameraViewController: WKNavigationDelegate {
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        decisionHandler(.allow)
    }
}

// MARK: - CLLocationManagerDelegate

extension GeoCameraViewController: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last,
              let requestId = pendingLocationRequestId else { return }
        pendingLocationRequestId = nil
        sendLocationToWeb(requestId: requestId, location: location)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Location failed - web app will show fallback
        pendingLocationRequestId = nil
    }
}

// MARK: - Info.plist에 추가 필요:
// NSCameraUsageDescription: "사진 촬영을 위해 카메라 접근이 필요합니다"
// NSLocationWhenInUseUsageDescription: "사진 워터마크에 위치 정보를 표시하기 위해 필요합니다"
// NSPhotoLibraryAddUsageDescription: "촬영한 사진을 갤러리에 저장하기 위해 필요합니다"
