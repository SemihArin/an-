import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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
  authName: $("#authName"),
  authEmail: $("#authEmail"),
  authPassword: $("#authPassword"),
  emailLoginButton: $("#emailLoginButton"),
  emailRegisterButton: $("#emailRegisterButton"),
  authError: $("#authError"),
  authCard: $(".auth-card"),
  showRegister: $("#showRegister"),
  showLogin: $("#showLogin"),
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
  messageTemplate: $("#messageTemplate"),
  recenterButton: $("#recenterButton"),
  sheetHandle: $("#sheetHandle"),
  locationView: $("#locationView"),
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
  friendsList: $("#friendsList"),
  friendsCount: $("#friendsCount"),
  focusName: $("#focusName"),
  consentOverlay: $("#consentOverlay"),
  consentCheckbox: $("#consentCheckbox"),
  consentAgreeButton: $("#consentAgreeButton"),
  consentCancelButton: $("#consentCancelButton"),
  addPlaceButton: $("#addPlaceButton"),
  savedPlacesList: $("#savedPlacesList"),
  placeModal: $("#placeModal"),
  placeNameInput: $("#placeNameInput"),
  placeRadiusInput: $("#placeRadiusInput"),
  placeSaveButton: $("#placeSaveButton"),
  placeCancelButton: $("#placeCancelButton"),
};

const CONSENT_KEY = "konum-paylasim-onayi";

let app;
let auth;
let db;
let storage;
let currentUser;
let currentRoom = "arkadaslar";
let unsubscribeMessages;

let unsubscribeMembers;
let unsubscribeHistory;
let watchId = null;
let sharing = false;
let wakeLock = null;
let map;
let trail;
let mapReady = false;
let members = new Map(); // uid -> member data
let markers = new Map(); // uid -> L.marker
let memberCircles = new Map(); // uid -> L.circle
let focusUid = null; // detay/iz gosterilen kisi (varsayilan: sen)
let didAutoFit = false;
let latestHistory = [];
let lastHistoryPoint = null;
let lastGeocode = { key: "", at: 0, text: "" };
let unsubscribePlaces;
let places = new Map(); // id -> {name,lat,lng,radius,...}
let placeLayers = new Map(); // id -> {circle, label}
let geoState = {}; // placeId -> icerideyim mi (bool)
let addPlaceMode = false;
let pendingPlaceLatLng = null;
let swRegistration = null;
const SHARE_NOTIF_ID = 4242;
const SHARE_NOTIF_TAG = "konum-paylasim";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then((reg) => {
      swRegistration = reg;
    })
    .catch(() => {
      /* SW yoksa web bildirimi devre disi, banner yine calisir */
    });
}

if (hasFirebaseConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  dom.setupWarning.classList.add("is-hidden");
  watchAuth();
} else {
  dom.loginButton.disabled = true;
  dom.setupWarning.classList.remove("is-hidden");
  setStatus("Firebase ayari bekleniyor");
}

dom.loginButton.addEventListener("click", async () => {
  if (!hasFirebaseConfig) return;
  await signInWithPopup(auth, new GoogleAuthProvider());
});

dom.logoutButton.addEventListener("click", () => signOut(auth));

function setAuthMode(mode) {
  if (dom.authCard) dom.authCard.dataset.mode = mode;
  hideAuthError();
  if (mode === "register") dom.authName?.focus();
  else dom.authEmail?.focus();
}

dom.showRegister?.addEventListener("click", () => setAuthMode("register"));
dom.showLogin?.addEventListener("click", () => setAuthMode("login"));

dom.emailLoginButton.addEventListener("click", async () => {
  if (!hasFirebaseConfig) return;
  const email = dom.authEmail.value.trim();
  const password = dom.authPassword.value;
  if (!email || !password) {
    showAuthError("E-posta ve sifre gir");
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    hideAuthError();
  } catch (err) {
    showAuthError(authErrorText(err));
  }
});

dom.emailRegisterButton.addEventListener("click", async () => {
  if (!hasFirebaseConfig) return;
  const email = dom.authEmail.value.trim();
  const password = dom.authPassword.value;
  const name = dom.authName.value.trim();
  if (!email || !password) {
    showAuthError("E-posta ve sifre gir");
    return;
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    if (dom.userName) dom.userName.textContent = name || cred.user.email || "Kullanici";
    hideAuthError();
  } catch (err) {
    showAuthError(authErrorText(err));
  }
});

function showAuthError(text) {
  dom.authError.textContent = text;
  dom.authError.classList.remove("is-hidden");
}

function hideAuthError() {
  dom.authError.classList.add("is-hidden");
}

function authErrorText(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "E-posta veya sifre hatali";
  if (code.includes("email-already-in-use")) return "Bu e-posta zaten kayitli, giris yap";
  if (code.includes("weak-password")) return "Sifre en az 6 karakter olmali";
  if (code.includes("invalid-email")) return "Gecersiz e-posta";
  if (code.includes("operation-not-allowed")) return "Firebase'de E-posta/Sifre yontemini etkinlestir";
  if (code.includes("network")) return "Ag hatasi, baglantini kontrol et";
  return err?.message || "Giris yapilamadi";
}

dom.joinRoomButton.addEventListener("click", () => {
  currentRoom = cleanRoom(dom.roomInput.value);
  dom.roomInput.value = currentRoom;
  dom.activeRoomTitle.textContent = currentRoom;
  resetGroupState();
  listenToMessages();
  listenToLocation();
  setStatus("Gruba baglandi");
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
  if (!text) return;

  await addDoc(collection(db, "rooms", currentRoom, "messages"), {
    text,
    uid: currentUser.uid,
    displayName: currentUser.displayName || "Ben",
    photoURL: currentUser.photoURL || "",
    createdAt: serverTimestamp(),
  });

  dom.messageInput.value = "";
  setStatus("Mesaj gonderildi");
});

dom.recenterButton?.addEventListener("click", recenterOnMe);
dom.sheetHandle?.addEventListener("click", () => {
  dom.locationView?.classList.toggle("collapsed");
  if (map) setTimeout(() => map.invalidateSize(), 260);
});

dom.addPlaceButton?.addEventListener("click", () => {
  initMap();
  addPlaceMode = true;
  dom.locationView?.classList.add("collapsed");
  if (map) setTimeout(() => map.invalidateSize(), 260);
  setStatus("Haritada bir noktaya dokun");
});

dom.placeCancelButton?.addEventListener("click", () => {
  dom.placeModal?.classList.add("is-hidden");
  pendingPlaceLatLng = null;
});

dom.placeSaveButton?.addEventListener("click", async () => {
  if (!pendingPlaceLatLng || !db || !currentUser) return;
  const name = (dom.placeNameInput.value || "").trim() || "Kayitli yer";
  const radius = parseInt(dom.placeRadiusInput.value, 10) || 150;
  try {
    await addDoc(placesCol(), {
      name,
      lat: pendingPlaceLatLng.lat,
      lng: pendingPlaceLatLng.lng,
      radius,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    setStatus("Yer kaydedildi");
  } catch (_) {
    setStatus("Yer kaydedilemedi");
  }
  dom.placeModal?.classList.add("is-hidden");
  pendingPlaceLatLng = null;
});

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
      const avatarNode = makeAvatar("profile-avatar", user.displayName || user.email, user.photoURL, user.uid);
      dom.userPhoto.replaceWith(avatarNode);
      dom.userPhoto = avatarNode;
      listenToMessages();
      listenToLocation();
      setTimeout(onLocationTabShown, 60);
      setStatus("Giris yapildi");
    } else {
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeMembers) unsubscribeMembers();
      if (unsubscribeHistory) unsubscribeHistory();
      if (unsubscribePlaces) unsubscribePlaces();
      stopShare();
      resetGroupState();
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
  const time = message.createdAt?.toDate
    ? message.createdAt.toDate().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : "";

  if (message.type === "system") {
    const row = document.createElement("div");
    row.className = "msg-system";
    const span = document.createElement("span");
    span.textContent = time ? `${message.text} · ${time}` : message.text;
    row.appendChild(span);
    dom.messages.appendChild(row);
    return;
  }

  const mine = message.uid === currentUser?.uid;
  const row = document.createElement("div");
  row.className = `msg-row${mine ? " mine" : ""}`;

  if (!mine) {
    row.appendChild(makeAvatar("msg-avatar", message.displayName, message.photoURL, message.uid));
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (!mine) {
    const name = document.createElement("div");
    name.className = "bubble-name";
    name.textContent = message.displayName || "Arkadas";
    bubble.appendChild(name);
  }
  const text = document.createElement("div");
  text.className = "bubble-text";
  text.textContent = message.text || "";
  bubble.appendChild(text);
  const timeEl = document.createElement("div");
  timeEl.className = "bubble-time";
  timeEl.textContent = time;
  bubble.appendChild(timeEl);

  row.appendChild(bubble);
  dom.messages.appendChild(row);
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

function memberDoc(uid) {
  return doc(db, "rooms", currentRoom, "members", uid);
}

function membersCol() {
  return collection(db, "rooms", currentRoom, "members");
}

function memberHistoryCol(uid) {
  return collection(db, "rooms", currentRoom, "members", uid, "history");
}

function onLocationTabShown() {
  initMap();
  if (map) setTimeout(() => map.invalidateSize(), 60);
  renderMembers();
  renderTrail();
  renderFocusDetail();
}

function initMap() {
  if (mapReady || typeof L === "undefined") return;
  map = L.map(dom.locationMap, { zoomControl: true, attributionControl: true }).setView([39.925, 32.866], 6);
  map.zoomControl.setPosition("topright");
  // OpenStreetMap kareleri + CSS filtresi ile koyu tema (API anahtari gerekmez)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);
  dom.locationMap.classList.add("dark-tiles");
  trail = L.polyline([], { color: "#6c8cff", weight: 5, opacity: 0.85, lineJoin: "round" }).addTo(map);
  map.on("click", onMapClick);
  mapReady = true;
  renderPlaceCircles();
}

function onMapClick(event) {
  if (!addPlaceMode) return;
  addPlaceMode = false;
  pendingPlaceLatLng = event.latlng;
  if (dom.placeNameInput) dom.placeNameInput.value = "";
  dom.placeModal?.classList.remove("is-hidden");
}

function recenterOnMe() {
  const me = currentUser ? members.get(currentUser.uid) : null;
  if (me && mapReady && typeof me.lat === "number") {
    map.setView([me.lat, me.lng], 16);
    return;
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (mapReady) map.setView([pos.coords.latitude, pos.coords.longitude], 16);
      },
      () => setStatus("Konum alinamadi"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }
}

function resetGroupState() {
  clearAllMarkers();
  clearPlaceLayers();
  members = new Map();
  places = new Map();
  geoState = {};
  latestHistory = [];
  lastHistoryPoint = null;
  didAutoFit = false;
  focusUid = currentUser ? currentUser.uid : null;
  renderFriendsList();
  renderFocusDetail();
  renderSavedPlacesList();
}

function placesCol() {
  return collection(db, "rooms", currentRoom, "places");
}

function placeDoc(id) {
  return doc(db, "rooms", currentRoom, "places", id);
}

function clearPlaceLayers() {
  if (mapReady) {
    placeLayers.forEach(({ circle, label }) => {
      map.removeLayer(circle);
      map.removeLayer(label);
    });
  }
  placeLayers.clear();
}

function renderPlaceCircles() {
  if (!mapReady) return;
  places.forEach((p, id) => {
    if (typeof p.lat !== "number" || typeof p.lng !== "number") return;
    const latlng = [p.lat, p.lng];
    const radius = p.radius || 150;
    let layer = placeLayers.get(id);
    if (!layer) {
      const circle = L.circle(latlng, {
        radius,
        color: "#f5a524",
        weight: 1.5,
        fillColor: "#f5a524",
        fillOpacity: 0.12,
      }).addTo(map);
      const label = L.marker(latlng, {
        icon: L.divIcon({
          className: "place-label-wrap",
          html: `<span class="place-label">${escapeHtml(p.name || "Yer")}</span>`,
          iconSize: [0, 0],
        }),
        interactive: false,
      }).addTo(map);
      placeLayers.set(id, { circle, label });
    } else {
      layer.circle.setLatLng(latlng);
      layer.circle.setRadius(radius);
      layer.label.setLatLng(latlng);
    }
  });
  placeLayers.forEach((layer, id) => {
    if (!places.has(id)) {
      map.removeLayer(layer.circle);
      map.removeLayer(layer.label);
      placeLayers.delete(id);
    }
  });
}

function renderSavedPlacesList() {
  if (!dom.savedPlacesList) return;
  dom.savedPlacesList.innerHTML = "";
  if (places.size === 0) {
    const li = document.createElement("li");
    li.className = "place-empty";
    li.textContent = "Henuz kayitli yer yok. Haritadan ekle.";
    dom.savedPlacesList.appendChild(li);
    return;
  }
  places.forEach((p, id) => {
    const li = document.createElement("li");
    li.className = "place-item";
    const info = document.createElement("div");
    info.className = "place-info";
    const name = document.createElement("strong");
    name.textContent = p.name || "Yer";
    const meta = document.createElement("span");
    meta.className = "place-meta";
    meta.textContent = `${p.radius || 150} m yaricap`;
    info.append(name, meta);
    const del = document.createElement("button");
    del.className = "icon-btn ghost";
    del.type = "button";
    del.setAttribute("aria-label", "Sil");
    del.textContent = "✕";
    del.addEventListener("click", () => deletePlace(id));
    li.append(info, del);
    dom.savedPlacesList.appendChild(li);
  });
}

async function deletePlace(id) {
  if (!db) return;
  try {
    await deleteDoc(placeDoc(id));
    delete geoState[id];
    setStatus("Yer silindi");
  } catch (_) {
    setStatus("Yer silinemedi");
  }
}

function myName() {
  return currentUser?.displayName || "Biri";
}

// Kayitli yerlere giris/cikisi kendi cihazin tespit eder ve sohbete yazar.
function checkGeofences(lat, lng) {
  if (!places.size || !currentUser) return;
  let changed = false;
  places.forEach((p, id) => {
    if (typeof p.lat !== "number" || typeof p.lng !== "number") return;
    const inside = distanceMeters(lat, lng, p.lat, p.lng) <= (p.radius || 150);
    const prev = geoState[id];
    if (prev === undefined) {
      geoState[id] = inside; // ilk okuma: sessizce durumu ayarla
      return;
    }
    if (inside && !prev) {
      geoState[id] = true;
      changed = true;
      postSystemMessage(`${myName()}, ${p.name || "yer"} konumuna giris yapti`);
    } else if (!inside && prev) {
      geoState[id] = false;
      changed = true;
      postSystemMessage(`${myName()}, ${p.name || "yer"} konumundan cikti`);
    }
  });
  return changed;
}

async function postSystemMessage(text) {
  if (!db || !currentUser) return;
  try {
    await addDoc(collection(db, "rooms", currentRoom, "messages"), {
      text,
      type: "system",
      uid: currentUser.uid,
      displayName: currentUser.displayName || "Biri",
      createdAt: serverTimestamp(),
    });
  } catch (_) {
    /* yoksay */
  }
}

// Gruptaki herkesin konumunu dinle; herkes birbirini haritada gorur.
function listenToLocation() {
  if (!db || !currentUser) return;
  if (unsubscribeMembers) unsubscribeMembers();
  if (!focusUid) focusUid = currentUser.uid;

  unsubscribeMembers = onSnapshot(membersCol(), (snap) => {
    members = new Map();
    snap.forEach((entry) => members.set(entry.id, entry.data()));
    renderMembers();
  });

  listenToFocusHistory();
  listenToPlaces();
}

function listenToPlaces() {
  if (!db || !currentUser) return;
  if (unsubscribePlaces) unsubscribePlaces();
  unsubscribePlaces = onSnapshot(placesCol(), (snap) => {
    places = new Map();
    snap.forEach((entry) => places.set(entry.id, entry.data()));
    renderPlaceCircles();
    renderSavedPlacesList();
  });
}

// Secili kisinin (varsayilan: sen) gecmis izini dinle.
function listenToFocusHistory() {
  if (!db || !focusUid) return;
  if (unsubscribeHistory) unsubscribeHistory();

  const historyQuery = query(memberHistoryCol(focusUid), orderBy("at", "desc"), limit(300));
  unsubscribeHistory = onSnapshot(historyQuery, (snap) => {
    latestHistory = [];
    snap.forEach((entry) => latestHistory.push(entry.data()));
    latestHistory.reverse();
    renderTrail();
  });
}

function focusMember(uid) {
  focusUid = uid;
  const m = members.get(uid);
  if (m && mapReady && typeof m.lat === "number") map.setView([m.lat, m.lng], 16);
  listenToFocusHistory();
  renderFriendsList();
  renderFocusDetail();
}

function renderMembers() {
  if (mapReady) {
    members.forEach((m, uid) => updateMemberMarker(uid, m));
    markers.forEach((mk, uid) => {
      if (!members.has(uid)) {
        map.removeLayer(mk);
        markers.delete(uid);
        const circle = memberCircles.get(uid);
        if (circle) {
          map.removeLayer(circle);
          memberCircles.delete(uid);
        }
      }
    });
    autoFitOnce();
  }
  renderFriendsList();
  renderFocusDetail();
}

function updateMemberMarker(uid, m) {
  if (!mapReady || typeof m.lat !== "number" || typeof m.lng !== "number") return;
  const latlng = [m.lat, m.lng];
  const isMe = uid === currentUser?.uid;
  const color = isMe ? "#ef6f6c" : colorForUid(uid);

  let mk = markers.get(uid);
  if (!mk) {
    mk = L.marker(latlng, { icon: personIcon(color, m.displayName, isMe) }).addTo(map);
    mk.on("click", () => focusMember(uid));
    markers.set(uid, mk);
  } else {
    mk.setLatLng(latlng);
    mk.setIcon(personIcon(color, m.displayName, isMe));
  }

  const element = mk.getElement();
  if (element) element.style.opacity = m.sharing === false ? "0.45" : "1";

  if (typeof m.accuracy === "number") {
    let circle = memberCircles.get(uid);
    if (!circle) {
      circle = L.circle(latlng, { radius: m.accuracy, color, weight: 1, fillOpacity: 0.06 }).addTo(map);
      memberCircles.set(uid, circle);
    } else {
      circle.setLatLng(latlng);
      circle.setRadius(m.accuracy);
    }
  }
}

function personIcon(color, name, isMe) {
  const label = isMe ? "Sen" : (name || "").trim().split(" ")[0] || "?";
  return L.divIcon({
    className: "person-pin-wrap",
    html: `<span class="person-pin" style="--pin:${color}"></span><span class="person-name">${escapeHtml(label)}</span>`,
    iconSize: [24, 34],
    iconAnchor: [12, 30],
  });
}

function initialOf(name) {
  const s = (name || "").trim();
  return s ? s.charAt(0).toUpperCase() : "?";
}

function makeInitials(className, name, uid) {
  const div = document.createElement("div");
  div.className = `${className} avatar-initials`;
  div.textContent = initialOf(name);
  if (uid) div.style.background = colorForUid(uid);
  return div;
}

// Foto varsa goster (no-referrer ile Google fotolari da yuklenir); yuklenemezse bas harf.
function makeAvatar(className, name, photoURL, uid) {
  if (photoURL) {
    const img = document.createElement("img");
    img.className = className;
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => img.replaceWith(makeInitials(className, name, uid)));
    img.src = photoURL;
    return img;
  }
  return makeInitials(className, name, uid);
}

function colorForUid(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i += 1) hash = (hash * 31 + uid.charCodeAt(i)) % 360;
  return `hsl(${hash} 68% 55%)`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}

function autoFitOnce() {
  if (didAutoFit) return;
  const points = [];
  members.forEach((m) => {
    if (typeof m.lat === "number" && typeof m.lng === "number") points.push([m.lat, m.lng]);
  });
  if (points.length === 0) return;
  if (points.length === 1) map.setView(points[0], 15);
  else map.fitBounds(points, { padding: [40, 40] });
  didAutoFit = true;
}

function clearAllMarkers() {
  if (!mapReady) return;
  markers.forEach((mk) => map.removeLayer(mk));
  memberCircles.forEach((circle) => map.removeLayer(circle));
  markers.clear();
  memberCircles.clear();
  if (trail) trail.setLatLngs([]);
}

function renderFriendsList() {
  if (!dom.friendsList) return;
  dom.friendsList.innerHTML = "";
  const rows = [...members.entries()];
  dom.friendsCount.textContent = rows.length ? `${rows.length} kisi` : "";

  rows.sort(([ua, a], [ub, b]) => {
    if (ua === currentUser?.uid) return -1;
    if (ub === currentUser?.uid) return 1;
    const sa = a.sharing === false ? 0 : 1;
    const sb = b.sharing === false ? 0 : 1;
    if (sa !== sb) return sb - sa;
    return (a.displayName || "").localeCompare(b.displayName || "");
  });

  const me = currentUser ? members.get(currentUser.uid) : null;

  rows.forEach(([uid, m]) => {
    const li = document.createElement("li");
    li.className = "friend-row";
    if (uid === focusUid) li.classList.add("is-focused");
    li.addEventListener("click", () => focusMember(uid));

    const avatar = makeAvatar("friend-avatar", uid === currentUser?.uid ? "Sen" : m.displayName, m.photoURL, uid);

    const info = document.createElement("div");
    info.className = "friend-info";
    const nameEl = document.createElement("strong");
    nameEl.textContent = uid === currentUser?.uid ? "Sen" : m.displayName || "Arkadas";
    const metaEl = document.createElement("span");
    metaEl.className = "friend-meta";
    const seen = m.updatedAt?.toDate ? relativeTime(m.updatedAt.toDate()) : "-";
    let distText = "";
    if (me && uid !== currentUser?.uid && typeof me.lat === "number" && typeof m.lat === "number") {
      distText = ` · ${formatDistance(distanceMeters(me.lat, me.lng, m.lat, m.lng))}`;
    }
    metaEl.textContent = `${m.sharing === false ? "durdu" : "canli"} · ${seen}${distText}`;
    info.append(nameEl, metaEl);

    const dot = document.createElement("span");
    dot.className = `friend-dot ${m.sharing === false ? "off" : "on"}`;

    li.append(avatar, info, dot);
    dom.friendsList.appendChild(li);
  });
}

function renderFocusDetail() {
  if (!dom.focusName) return;
  const m = focusUid ? members.get(focusUid) : null;
  const name = focusUid === currentUser?.uid ? "Sen" : m?.displayName || "Arkadas";
  dom.focusName.textContent = `${name} - konum`;

  if (!m || typeof m.lat !== "number" || typeof m.lng !== "number") {
    dom.lastUpdate.textContent = "-";
    dom.currentCoords.textContent = "-";
    dom.currentMeta.textContent = "-";
    dom.currentAddress.textContent = "-";
    return;
  }

  const time = m.updatedAt?.toDate ? m.updatedAt.toDate().toLocaleString("tr-TR") : "-";
  dom.lastUpdate.textContent = m.sharing === false ? `${time} (durduruldu)` : time;
  dom.currentCoords.textContent = `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}`;

  const me = currentUser ? members.get(currentUser.uid) : null;
  let distText = "-";
  if (me && focusUid !== currentUser?.uid && typeof me.lat === "number") {
    distText = formatDistance(distanceMeters(me.lat, me.lng, m.lat, m.lng));
  }
  const accText = typeof m.accuracy === "number" ? `${m.accuracy.toFixed(0)} m` : "-";
  dom.currentMeta.textContent = `${distText} / ${accText}`;
  reverseGeocode(m.lat, m.lng);
}

function renderTrail() {
  if (!mapReady || !trail) return;
  const points = latestHistory
    .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
    .map((p) => [p.lat, p.lng]);
  trail.setLatLngs(points);
}

function relativeTime(date) {
  const sec = Math.round((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "az once";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} dk once`;
  const hour = Math.round(min / 60);
  if (hour < 24) return `${hour} sa once`;
  return date.toLocaleDateString("tr-TR");
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
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
  await showShareNotification();
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
        memberDoc(currentUser.uid),
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
  await clearShareNotification();
}

async function onPosition(position) {
  const { latitude, longitude, accuracy, heading, speed } = position.coords;

  try {
    await setDoc(
      memberDoc(currentUser.uid),
      {
        uid: currentUser.uid,
        displayName: currentUser.displayName || "Ben",
        photoURL: currentUser.photoURL || "",
        lat: latitude,
        lng: longitude,
        accuracy: accuracy ?? null,
        heading: heading ?? null,
        speed: speed ?? null,
        sharing: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (_) {
    setStatus("Konum yazilamadi");
    return;
  }

  checkGeofences(latitude, longitude);

  const now = Date.now();
  const moved =
    !lastHistoryPoint ||
    distanceMeters(lastHistoryPoint.lat, lastHistoryPoint.lng, latitude, longitude) > 25;
  const waited = !lastHistoryPoint || now - lastHistoryPoint.at > 60000;

  if (moved || waited) {
    lastHistoryPoint = { lat: latitude, lng: longitude, at: now };
    try {
      await addDoc(memberHistoryCol(currentUser.uid), {
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
    const snap = await getDocs(memberHistoryCol(currentUser.uid));
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

async function showShareNotification() {
  // APK (Capacitor) icinde: kalici (ongoing) native bildirim.
  const LN = window.Capacitor?.Plugins?.LocalNotifications;
  if (LN) {
    try {
      const perm = await LN.requestPermissions();
      if (perm?.display !== "granted") return;
      await LN.schedule({
        notifications: [
          {
            id: SHARE_NOTIF_ID,
            title: "Konum paylasiliyor",
            body: "Canli konumun su anda paylasiliyor. Durdurmak icin uygulamayi ac.",
            ongoing: true,
            autoCancel: false,
          },
        ],
      });
    } catch (_) {
      /* yoksay */
    }
    return;
  }

  // Web/PWA: service worker bildirimi.
  try {
    if (!("Notification" in window) || !swRegistration) return;
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission !== "granted") return;
    await swRegistration.showNotification("Konum paylasiliyor", {
      body: "Canli konumun su anda paylasiliyor. Durdurmak icin uygulamayi ac.",
      tag: SHARE_NOTIF_TAG,
      requireInteraction: true,
      silent: true,
    });
  } catch (_) {
    /* yoksay */
  }
}

async function clearShareNotification() {
  const LN = window.Capacitor?.Plugins?.LocalNotifications;
  if (LN) {
    try {
      await LN.cancel({ notifications: [{ id: SHARE_NOTIF_ID }] });
    } catch (_) {
      /* yoksay */
    }
    return;
  }

  try {
    if (!swRegistration) return;
    const notes = await swRegistration.getNotifications({ tag: SHARE_NOTIF_TAG });
    notes.forEach((note) => note.close());
  } catch (_) {
    /* yoksay */
  }
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
  return (value || "arkadaslar").trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-").slice(0, 48);
}

function setStatus(text) {
  dom.statusPill.textContent = text;
}
