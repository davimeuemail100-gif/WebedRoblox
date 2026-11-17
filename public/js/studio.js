import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- CONFIGURAÇÃO 3D ---
const viewport = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
viewport.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
scene.add(new THREE.DirectionalLight(0xffffff, 2).translateY(10));
scene.add(new THREE.AmbientLight(0x404040));
scene.add(new THREE.GridHelper(50, 50));
(function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); })();

// --- CORE GUI & CHAT ---
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== chatInput) {
        e.preventDefault(); chatInput.style.display = 'block'; chatInput.focus();
    }
});
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const msg = chatInput.value; chatInput.value = ''; chatInput.style.display = 'none';
        addChatMessage("Jogador", msg);
        if(clientWorker) clientWorker.postMessage({ type: "chat", msg: msg });
    }
});
function addChatMessage(user, text) {
    chatBox.innerHTML += `<div><b>${user}:</b> ${text}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- VOICE CHAT ---
document.getElementById('voice-btn').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        document.getElementById('voice-btn').style.background = 'green';
        console.log("Microfone WebRTC capturado");
    } catch (err) { console.error("Erro no microfone", err); }
});

// --- WEB WORKERS (SERVER E CLIENT) ---
let serverWorker, clientWorker;
const statusDiv = document.getElementById('status');
function logConsole(msg) { statusDiv.innerHTML += `<br>> ${msg}`; statusDiv.scrollTop = statusDiv.scrollHeight; }

document.getElementById('play-btn').addEventListener('click', () => {
    // Limpa cena
    for(let i = scene.children.length - 1; i >= 0; i--){ if(scene.children[i].type === 'Mesh') scene.remove(scene.children[i]); }
    logConsole("Iniciando Server e Client Workers...");

    if(serverWorker) serverWorker.terminate();
    if(clientWorker) clientWorker.terminate();

    // 1. Inicia Servidor
    serverWorker = new Worker('./js/server.worker.js', { type: 'module' });
    serverWorker.postMessage({ type: 'init', code: document.getElementById('server-code').value });

    // 2. Inicia Cliente
    clientWorker = new Worker('./js/client.worker.js', { type: 'module' });
    clientWorker.postMessage({ type: 'init', code: document.getElementById('client-code').value });

    // Comunicação Servidor -> Tela
    serverWorker.onmessage = (e) => {
        if(e.data.type === 'create_part') {
            const g = new THREE.BoxGeometry(1,1,1);
            const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(e.data.color) });
            const cube = new THREE.Mesh(g, m);
            cube.position.set(e.data.x, e.data.y, e.data.z);
            scene.add(cube);
        }
        if(e.data.type === 'log') logConsole("[Server] " + e.data.msg);
        if(e.data.type === 'chat') addChatMessage(e.data.user, e.data.text);
        if(e.data.type === 'datastore') {
            fetch('/api/sync-datastore', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entryKey: e.data.key, data: e.data.data })
            }).then(r => logConsole(r.ok ? "✅ DataStore Real Salvo!" : "❌ Erro DataStore"));
        }
    };

    // Comunicação Cliente -> Tela
    clientWorker.onmessage = (e) => {
        if(e.data.type === 'log') logConsole("[Client] " + e.data.msg);
        if(e.data.type === 'coregui') logConsole(`[CoreGui Notif] ${e.data.title}: ${e.data.text}`);
    };
});
