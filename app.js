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
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "BURAYA_API_KEY",
  authDomain: "BURAYA_PROJECT.firebaseapp.com",
  projectId: "BURAYA_PROJECT_ID",
  storageBucket: "BURAYA_PROJECT.appspot.com",
  messagingSenderId: "BURAYA_SENDER_ID",
  appId: "BURAYA_APP_ID",
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
};

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
      setStatus("Giris yapildi");
    } else {
      if (unsubscribeMessages) unsubscribeMessages();
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

function cleanRoom(value) {
  return (value || "bizim-odamiz").trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-").slice(0, 48);
}

function setStatus(text) {
  dom.statusPill.textContent = text;
}
