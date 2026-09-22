import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmabbsj_gsJ28qpAOwWEFy5IxGqwM90F8",
  authDomain: "teste-6c5e5.firebaseapp.com",
  projectId: "teste-6c5e5",
  storageBucket: "teste-6c5e5.firebasestorage.app",
  messagingSenderId: "662582202182",
  appId: "1:662582202182:web:2bfbf2bc3f35cb8ca19f47",
  measurementId: "G-XFPLB3GE0Z"
};

const hasFirebaseConfig = !Object.values(firebaseConfig).some((value) => value.startsWith("BURAYA_"));
const $ = (selector) => document.querySelector(selector);

const dom = {
  authPanel: $("#authPanel"),
  workspace: $("#workspace"),
  setupWarning: $("#setupWarning"),
  loginButton: $("#loginButton"),
  logoutButton: $("#logoutButton"),
  userPhoto: $("#userPhoto"),
  userName: $("#userName"),
  userEmail: $("#userEmail"),
  roomInput: $("#roomInput"),
  joinRoomButton: $("#joinRoomButton"),
  activeRoomTitle: $("#activeRoomTitle"),
  statusPill: $("#statusPill"),
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  messages: $("#messages"),
  messageForm: $("#messageForm"),
  messageInput: $("#messageInput"),
  attachLastCaptureButton: $("#attachLastCaptureButton"),
  cameraPreview: $("#cameraPreview"),
  photoCanvas: $("#photoCanvas"),
  startCameraButton: $("#startCameraButton"),
  takePhotoButton: $("#takePhotoButton"),
  recordButton: $("#recordButton"),
  uploadCaptureButton: $("#uploadCaptureButton"),
  capturePreview: $("#capturePreview"),
  localVideo: $("#localVideo"),
  remoteVideo: $("#remoteVideo"),
  prepareCallButton: $("#prepareCallButton"),
  createCallButton: $("#createCallButton"),
  answerCallButton: $("#answerCallButton"),
  hangupButton: $("#hangupButton"),
  messageTemplate: $("#messageTemplate"),
  shareBanner: $("#shareBanner"),
  shareBannerText: $("#shareBannerText"),
  startShareButton: $("#startShareButton"),
  stopShareButton: $("#stopShareButton"),
  clearHistoryButton: $("#clearHistoryButton"),
  locationMap: $("#locationMap"),
  lastUpdate: $("#lastUpdate"),
  currentAddress: $("#currentAddress"),
  currentCoords: $("#currentCoords"),
  currentMeta: $("#currentMeta"),
  placesList: $("#placesList"),
  placesCount: $("#placesCount"),
  consentOverlay: $("#consentOverlay"),
  consentCheckbox: $("#consentCheckbox"),
  consentAgreeButton: $("#consentAgreeButton"),
  consentCancelButton: $("#consentCancelButton"),
};

const CONSENT_KEY = "konum-paylasim-onayi";

let app;
let auth;
let db;
let storage;
let currentUser;
let currentRoom = "bizim-odamiz";
let unsubscribeMessages;
let unsubscribeCall;
let cameraStream;
let callStream;
let remoteStream;
let recorder;
let recordedChunks = [];
let lastCapture;
let lastCaptureUrl;
let peerConnection;
let callId;

let unsubscribeCurrent;
let unsubscribeHistory;
let watchId = null;
let sharing = false;
let wakeLock = null;
let map;
let marker;
let accuracyCircle;
let trail;
let mapReady = false;
let latestCurrent = null;
let latestHistory = [];
let lastHistoryPoint = null;
let lastGeocode = { key: "", at: 0, text: "" };

const rtcConfig = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

if (hasFirebaseConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  dom.setupWarning.classList.add("is-hidden");
  watchAuth();
} else {
  dom.loginButton.disabled = true;
  setStatus("Firebase ayari bekleniyor");
}

dom.loginButton.addEventListener("click", async () => {
  if (!hasFirebaseConfig) return;
  await signInWithPopup(auth, new GoogleAuthProvider());
});

dom.logoutButton.addEventListener("click", () => signOut(auth));

dom.joinRoomButton.addEventListener("click", () => {
  currentRoom = cleanRoom(dom.roomInput.value);
  dom.roomInput.value = currentRoom;
  dom.activeRoomTitle.textContent = currentRoom;
  listenToMessages();
  listenToLocation();
  setStatus("Odaya baglandi");
});

dom.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    dom.tabs.forEach((item) => item.classList.remove("is-active"));
    dom.views.forEach((view) => view.classList.add("is-hidden"));
    tab.classList.add("is-active");
    $(`#${tab.dataset.view}`).classList.remove("is-hidden");
  });
});

dom.messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = dom.messageInput.value.trim();
  if (!text && !lastCaptureUrl) return;

  await addDoc(collection(db, "rooms", currentRoom, "messages"), {
    text,
    attachmentUrl: lastCaptureUrl || "",
    attachmentName: lastCapture?.name || "",
    uid: currentUser.uid,
    displayName: currentUser.displayName || "Ben",
    photoURL: currentUser.photoURL || "",
    createdAt: serverTimestamp(),
  });

  dom.messageInput.value = "";
  lastCaptureUrl = "";
  setStatus("Mesaj gonderildi");
});

dom.attachLastCaptureButton.addEventListener("click", async () => {
  if (!lastCapture) {
    setStatus("Once fotograf veya video cek");
    return;
  }
  lastCaptureUrl = await uploadCapture(lastCapture);
  setStatus("Son cekim mesaja eklendi");
});

dom.startCameraButton.addEventListener("click", startCamera);
dom.takePhotoButton.addEventListener("click", takePhoto);
dom.recordButton.addEventListener("click", toggleRecording);
dom.uploadCaptureButton.addEventListener("click", async () => {
  if (!lastCapture) return;
  lastCaptureUrl = await uploadCapture(lastCapture);
  setStatus("Cekim Firebase Storage'a yuklendi");
});

dom.prepareCallButton.addEventListener("click", prepareCall);
dom.createCallButton.addEventListener("click", createCall);
dom.answerCallButton.addEventListener("click", answerCall);
dom.hangupButton.addEventListener("click", hangup);

dom.startShareButton.addEventListener("click", startShare);
dom.stopShareButton.addEventListener("click", stopShare);
dom.clearHistoryButton.addEventListener("click", clearHistory);
dom.consentCheckbox.addEventListener("change", () => {
  dom.consentAgreeButton.disabled = !dom.consentCheckbox.checked;
});
dom.consentAgreeButton.addEventListener("click", () => {
  if (!dom.consentCheckbox.checked) return;
  if (!currentUser) {
    hideConsent();
    setStatus("Once Google ile giris yap");
    return;
  }
  setConsent(true);
  hideConsent();
  startShare();
});
dom.consentCancelButton.addEventListener("click", () => {
  hideConsent();
  setStatus("Konum paylasimi onaylanmadi");
});
$('[data-view="locationView"]').addEventListener("click", onLocationTabShown);
document.addEventListener("visibilitychange", async () => {
  if (sharing && wakeLock === null && document.visibilityState === "visible") {
    await requestWakeLock();
  }
});

function watchAuth() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    dom.authPanel.classList.toggle("is-hidden", !!user);
    dom.workspace.classList.toggle("is-hidden", !user);

    if (user) {
      dom.userName.textContent = user.displayName || "Kullanici";
      dom.userEmail.textContent = user.email || "";
      dom.userPhoto.src = user.photoURL || "";
      listenToMessages();
      listenToLocation();
      setStatus("Giris yapildi");
    } else {
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeCurrent) unsubscribeCurrent();
      if (unsubscribeHistory) unsubscribeHistory();
      stopShare();
      setStatus("Cikis yapildi");
    }
  });
}

function listenToMessages() {
  if (!db || !currentUser) return;
  if (unsubscribeMessages) unsubscribeMessages();

  const messagesQuery = query(
    collection(db, "rooms", currentRoom, "messages"),
    orderBy("createdAt", "asc"),
  );

  unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
    dom.messages.innerHTML = "";
    snapshot.forEach((messageDoc) => renderMessage(messageDoc.data()));
    dom.messages.scrollTop = dom.messages.scrollHeight;
  });
}

function renderMessage(message) {
  const node = dom.messageTemplate.content.firstElementChild.cloneNode(true);
  const time = message.createdAt?.toDate ? message.createdAt.toDate().toLocaleTimeString("tr-TR") : "";
  node.classList.toggle("is-mine", message.uid === currentUser.uid);
  node.querySelector(".message-meta").textContent = `${message.displayName || "Kullanici"} ${time}`;
  node.querySelector("p").textContent = message.text || "";

  const attachment = node.querySelector(".attachment");
  if (message.attachmentUrl) {
    attachment.href = message.attachmentUrl;
    attachment.textContent = message.attachmentName || "Eki ac";
  } else {
    attachment.remove();
  }

  dom.messages.appendChild(node);
}

async function startCamera() {
  cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  dom.cameraPreview.srcObject = cameraStream;
  dom.takePhotoButton.disabled = false;
  dom.recordButton.disabled = false;
  setStatus("Kamera acik");
}

function takePhoto() {
  const video = dom.cameraPreview;
  const canvas = dom.photoCanvas;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    lastCapture = new File([blob], `fotograf-${Date.now()}.jpg`, { type: "image/jpeg" });
    showCapture(URL.createObjectURL(blob), "image");
    dom.uploadCaptureButton.disabled = false;
    setStatus("Fotograf cekildi");
  }, "image/jpeg", 0.92);
}

function toggleRecording() {
  if (recorder?.state === "recording") {
    recorder.stop();
    dom.recordButton.textContent = "Video kaydet";
    return;
  }

  recordedChunks = [];
  recorder = new MediaRecorder(cameraStream, { mimeType: pickMimeType() });
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  });
  recorder.addEventListener("stop", () => {
    const type = recorder.mimeType || "video/webm";
    const blob = new Blob(recordedChunks, { type });
    lastCapture = new File([blob], `video-${Date.now()}.webm`, { type });
    showCapture(URL.createObjectURL(blob), "video");
    dom.uploadCaptureButton.disabled = false;
    setStatus("Video hazir");
  });
  recorder.start();
  dom.recordButton.textContent = "Kaydi durdur";
  setStatus("Video kaydediliyor");
}

function pickMimeType() {
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) return "video/webm;codecs=vp9";
  if (MediaRecorder.isTypeSupported("video/webm")) return "video/webm";
  return "";
}

function showCapture(url, type) {
  dom.capturePreview.innerHTML = "";
  const media = document.createElement(type === "image" ? "img" : "video");
  media.src = url;
  if (type === "video") media.controls = true;
  dom.capturePreview.appendChild(media);
}

async function uploadCapture(file) {
  const captureRef = ref(storage, `rooms/${currentRoom}/captures/${currentUser.uid}/${file.name}`);
  await uploadBytes(captureRef, file);
  return getDownloadURL(captureRef);
}

async function prepareCall() {
  callStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();
  dom.localVideo.srcObject = callStream;
  dom.remoteVideo.srcObject = remoteStream;
  dom.createCallButton.disabled = false;
  dom.answerCallButton.disabled = false;
  setStatus("Arama hazir");
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(rtcConfig);
  callStream.getTracks().forEach((track) => peerConnection.addTrack(track, callStream));
  peerConnection.addEventListener("track", (event) => {
    event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
  });
  return peerConnection;
}

async function createCall() {
  callId = currentRoom;
  const callDoc = doc(db, "rooms", currentRoom, "calls", callId);
  const offerCandidates = collection(callDoc, "offerCandidates");
  const answerCandidates = collection(callDoc, "answerCandidates");

  createPeerConnection();
  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) addDoc(offerCandidates, event.candidate.toJSON());
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  await setDoc(callDoc, {
    offer: { type: offer.type, sdp: offer.sdp },
    createdAt: serverTimestamp(),
    owner: currentUser.uid,
  });

  unsubscribeCall = onSnapshot(callDoc, (snapshot) => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data?.answer) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });

  onSnapshot(answerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
    });
  });

  dom.hangupButton.disabled = false;
  setStatus("Arama baslatildi");
}

async function answerCall() {
  callId = currentRoom;
  const callDoc = doc(db, "rooms", currentRoom, "calls", callId);
  const callSnapshot = await getDoc(callDoc);
  if (!callSnapshot.exists()) {
    setStatus("Bu odada aktif arama yok");
    return;
  }

  const offerCandidates = collection(callDoc, "offerCandidates");
  const answerCandidates = collection(callDoc, "answerCandidates");
  createPeerConnection();
  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) addDoc(answerCandidates, event.candidate.toJSON());
  });

  const callData = callSnapshot.data();
  await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  await setDoc(callDoc, { answer: { type: answer.type, sdp: answer.sdp } }, { merge: true });

  onSnapshot(offerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
    });
  });

  dom.hangupButton.disabled = false;
  setStatus("Aramaya katildi");
}

async function hangup() {
  peerConnection?.close();
  peerConnection = null;
  callStream?.getTracks().forEach((track) => track.stop());
  remoteStream?.getTracks().forEach((track) => track.stop());
  dom.localVideo.srcObject = null;
  dom.remoteVideo.srcObject = null;
  dom.createCallButton.disabled = true;
  dom.answerCallButton.disabled = true;
  dom.hangupButton.disabled = true;
  if (unsubscribeCall) unsubscribeCall();
  if (callId) await deleteDoc(doc(db, "rooms", currentRoom, "calls", callId));
  setStatus("Arama kapatildi");
}

// ---- Onay ----

function hasConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch (_) {
    return false;
  }
}

function setConsent(value) {
  try {
    if (value) localStorage.setItem(CONSENT_KEY, "1");
    else localStorage.removeItem(CONSENT_KEY);
  } catch (_) {
    /* localStorage yoksa yoksay */
  }
}

function showConsent() {
  if (!currentUser) {
    setStatus("Once Google ile giris yap");
    return;
  }
  dom.consentCheckbox.checked = false;
  dom.consentAgreeButton.disabled = true;
  dom.consentOverlay.classList.remove("is-hidden");
}

function hideConsent() {
  dom.consentOverlay.classList.add("is-hidden");
}

// ---- Konum paylasimi ----

function trackerCurrentDoc() {
  return doc(db, "rooms", currentRoom, "tracker", "current");
}

function trackerHistoryCol() {
  return collection(db, "rooms", currentRoom, "tracker", "history");
}

function onLocationTabShown() {
  initMap();
  if (map) setTimeout(() => map.invalidateSize(), 60);
  renderLocation();
  renderTrail();
  renderPlaces();
}

function initMap() {
  if (mapReady || typeof L === "undefined") return;
  map = L.map(dom.locationMap, { zoomControl: true }).setView([39.925, 32.866], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);
  trail = L.polyline([], { color: "#ef6f6c", weight: 4, opacity: 0.8 }).addTo(map);
  mapReady = true;
}

function listenToLocation() {
  if (!db || !currentUser) return;
  if (unsubscribeCurrent) unsubscribeCurrent();
  if (unsubscribeHistory) unsubscribeHistory();

  unsubscribeCurrent = onSnapshot(trackerCurrentDoc(), (snap) => {
    latestCurrent = snap.exists() ? snap.data() : null;
    renderLocation();
  });

  const historyQuery = query(trackerHistoryCol(), orderBy("at", "desc"), limit(300));
  unsubscribeHistory = onSnapshot(historyQuery, (snap) => {
    latestHistory = [];
    snap.forEach((entry) => latestHistory.push(entry.data()));
    latestHistory.reverse();
    renderTrail();
    renderPlaces();
  });
}

async function startShare() {
  if (!navigator.geolocation) {
    setStatus("Cihaz konum desteklemiyor");
    return;
  }
  if (sharing) return;
  // Giris yapilmadan konum iznine ve paylasima gecilmez.
  if (!currentUser) {
    setStatus("Once Google ile giris yap");
    dom.authPanel?.classList.remove("is-hidden");
    return;
  }

  // Onay verilmemisse once onay ekranini goster; paylasim baslamaz.
  if (!hasConsent()) {
    showConsent();
    return;
  }

  // Capacitor (APK) icinde calisiyorsa once native konum iznini iste.
  const geoPlugin = window.Capacitor?.Plugins?.Geolocation;
  if (geoPlugin) {
    try {
      const perm = await geoPlugin.requestPermissions();
      if (perm?.location === "denied" && perm?.coarseLocation === "denied") {
        setStatus("Konum izni reddedildi");
        return;
      }
    } catch (_) {
      /* izin sorgusu basarisiz - watchPosition yine de dener */
    }
  }

  watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 20000,
  });

  sharing = true;
  dom.startShareButton.disabled = true;
  dom.stopShareButton.disabled = false;
  setShareBanner(true);
  await requestWakeLock();
  setStatus("Konum paylasiliyor");
}

async function stopShare() {
  const wasSharing = sharing;
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  releaseWakeLock();

  if (wasSharing && db && currentUser) {
    try {
      await setDoc(
        trackerCurrentDoc(),
        { sharing: false, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (_) {
      /* offline - yoksay */
    }
  }

  sharing = false;
  dom.startShareButton.disabled = false;
  dom.stopShareButton.disabled = true;
  setShareBanner(false);
}

async function onPosition(position) {
  const { latitude, longitude, accuracy, heading, speed } = position.coords;

  try {
    await setDoc(
      trackerCurrentDoc(),
      {
        lat: latitude,
        lng: longitude,
        accuracy: accuracy ?? null,
        heading: heading ?? null,
        speed: speed ?? null,
        sharing: true,
        uid: currentUser.uid,
        displayName: currentUser.displayName || "Ben",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (_) {
    setStatus("Konum yazilamadi");
    return;
  }

  const now = Date.now();
  const moved =
    !lastHistoryPoint ||
    distanceMeters(lastHistoryPoint.lat, lastHistoryPoint.lng, latitude, longitude) > 25;
  const waited = !lastHistoryPoint || now - lastHistoryPoint.at > 60000;

  if (moved || waited) {
    lastHistoryPoint = { lat: latitude, lng: longitude, at: now };
    try {
      await addDoc(trackerHistoryCol(), {
        lat: latitude,
        lng: longitude,
        accuracy: accuracy ?? null,
        at: serverTimestamp(),
      });
    } catch (_) {
      /* yoksay */
    }
  }
}

function onPositionError(error) {
  setStatus(`Konum hatasi: ${error.message}`);
}

function renderLocation() {
  if (!latestCurrent) {
    dom.lastUpdate.textContent = "-";
    dom.currentCoords.textContent = "-";
    dom.currentMeta.textContent = "-";
    dom.currentAddress.textContent = "-";
    return;
  }

  const { lat, lng, accuracy, speed, updatedAt, sharing: isSharing } = latestCurrent;
  const time = updatedAt?.toDate ? updatedAt.toDate().toLocaleString("tr-TR") : "-";
  dom.lastUpdate.textContent = isSharing === false ? `${time} (durduruldu)` : time;

  if (typeof lat === "number" && typeof lng === "number") {
    dom.currentCoords.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const speedText = typeof speed === "number" && speed >= 0 ? `${(speed * 3.6).toFixed(0)} km/s` : "-";
    const accText = typeof accuracy === "number" ? `${accuracy.toFixed(0)} m` : "-";
    dom.currentMeta.textContent = `${accText} / ${speedText}`;
    updateMarker(lat, lng, accuracy);
    reverseGeocode(lat, lng);
  }
}

function updateMarker(lat, lng, accuracy) {
  if (!mapReady) return;
  const latlng = [lat, lng];
  if (!marker) {
    marker = L.marker(latlng).addTo(map);
    map.setView(latlng, 16);
  } else {
    marker.setLatLng(latlng);
  }
  if (typeof accuracy === "number") {
    if (!accuracyCircle) {
      accuracyCircle = L.circle(latlng, {
        radius: accuracy,
        color: "#4fb7a8",
        weight: 1,
        fillOpacity: 0.08,
      }).addTo(map);
    } else {
      accuracyCircle.setLatLng(latlng);
      accuracyCircle.setRadius(accuracy);
    }
  }
}

function renderTrail() {
  if (!mapReady || !trail) return;
  const points = latestHistory
    .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
    .map((p) => [p.lat, p.lng]);
  trail.setLatLngs(points);
}

function renderPlaces() {
  dom.placesList.innerHTML = "";
  dom.placesCount.textContent = latestHistory.length ? `${latestHistory.length} nokta` : "";
  const items = latestHistory.slice().reverse().slice(0, 40);
  items.forEach((p) => {
    const li = document.createElement("li");
    const time = p.at?.toDate ? p.at.toDate().toLocaleString("tr-TR") : "";
    const coords =
      typeof p.lat === "number" ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : "-";
    const timeSpan = document.createElement("span");
    timeSpan.className = "place-time";
    timeSpan.textContent = time;
    const coordSpan = document.createElement("span");
    coordSpan.className = "place-coords";
    coordSpan.textContent = coords;
    li.append(timeSpan, coordSpan);
    dom.placesList.appendChild(li);
  });
}

async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const now = Date.now();
  if (key === lastGeocode.key && lastGeocode.text) {
    dom.currentAddress.textContent = lastGeocode.text;
    return;
  }
  if (now - lastGeocode.at < 15000) return;
  lastGeocode = { key, at: now, text: lastGeocode.text };
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=tr`,
    );
    const data = await res.json();
    const text = data.display_name || "-";
    lastGeocode = { key, at: now, text };
    dom.currentAddress.textContent = text;
  } catch (_) {
    dom.currentAddress.textContent = "-";
  }
}

async function clearHistory() {
  if (!db || !currentUser) return;
  try {
    const snap = await getDocs(trackerHistoryCol());
    const batch = writeBatch(db);
    snap.forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
    lastHistoryPoint = null;
    setStatus("Gecmis temizlendi");
  } catch (_) {
    setStatus("Gecmis temizlenemedi");
  }
}

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    }
  } catch (_) {
    wakeLock = null;
  }
}

function releaseWakeLock() {
  try {
    wakeLock?.release();
  } catch (_) {
    /* yoksay */
  }
  wakeLock = null;
}

function setShareBanner(on) {
  dom.shareBanner.dataset.state = on ? "on" : "off";
  dom.shareBannerText.textContent = on ? "Konum paylasiliyor - canli" : "Konum paylasimi kapali";
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function cleanRoom(value) {
  return (value || "bizim-odamiz").trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-").slice(0, 48);
}

function setStatus(text) {
  dom.statusPill.textContent = text;
}
