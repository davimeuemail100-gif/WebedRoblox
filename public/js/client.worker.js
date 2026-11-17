import createLuau from '../wasm/luau.js';

self.onmessage = async (e) => {
    if (e.data.type !== 'init') return;
    const L = await createLuau();

    // Ponte: Log
    const ptrLog = L.addFunction((s) => {
        const msg = L.ccall('lua_tolstring', 'string', ['number','number'], [s, 1]);
        self.postMessage({ type: 'log', msg });
        return 0;
    }, 'ii');
    L.ccall('lua_pushcclosure', null, ['number','number','number'], [L.luaState, ptrLog, 0]);
    L.ccall('lua_setglobal', null, ['number','string'], [L.luaState, 'host_log']);

    // Ponte: CoreGui
    const ptrCoreGui = L.addFunction((s) => {
        const title = L.ccall('lua_tolstring', 'string', ['number','number'], [s, 1]);
        const text = L.ccall('lua_tolstring', 'string', ['number','number'], [s, 2]);
        self.postMessage({ type: 'coregui', title, text });
        return 0;
    }, 'ii');
    L.ccall('lua_pushcclosure', null, ['number','number','number'], [L.luaState, ptrCoreGui, 0]);
    L.ccall('lua_setglobal', null, ['number','string'], [L.luaState, 'host_core_gui']);

    // Ambiente Roblox do Cliente
    const env = `
        print = function(m) host_log(tostring(m)) end
        game = { GetService = function(_, n)
            if n == "CoreGui" then return { SetCore = function(_, a, d)
                if a == "SendNotification" then host_core_gui(d.Title, d.Text) end
            end } end
            if n == "CorePackages" then return {} end
            if n == "ReplicatedStorage" then return {} end
            return {}
        end }
        ${e.data.code}
    `;
    L.ccall('luaL_loadstring', 'number', ['number','string'], [L.luaState, env]);
    L.ccall('lua_pcallk', 'number', ['number','number','number','number','number','number'], [L.luaState, 0, 0, 0, 0, 0]);
};
