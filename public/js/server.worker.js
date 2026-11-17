import createLuau from '../wasm/luau.js';

self.onmessage = async (e) => {
    if (e.data.type !== 'init') return;
    const L = await createLuau();
    
    // Ponte: Criar Part 3D
    const ptrCreate = L.addFunction((s) => {
        const x = L.ccall('lua_tonumber', 'number', ['number','number'], [s, 1]);
        const y = L.ccall('lua_tonumber', 'number', ['number','number'], [s, 2]);
        const z = L.ccall('lua_tonumber', 'number', ['number','number'], [s, 3]);
        const color = L.ccall('lua_tolstring', 'string', ['number','number'], [s, 4]);
        self.postMessage({ type: 'create_part', x, y, z, color });
        return 0;
    }, 'ii');
    L.ccall('lua_pushcclosure', null, ['number','number','number'], [L.luaState, ptrCreate, 0]);
    L.ccall('lua_setglobal', null, ['number','string'], [L.luaState, 'host_create_part']);

    // Ponte: Chat
    const ptrChat = L.addFunction((s) => {
        const user = L.ccall('lua_tolstring', 'string', ['number','number'], [s, 1]);
        const text = L.ccall('lua_tolstring', 'string', ['number','number'], [s, 2]);
        self.postMessage({ type: 'chat', user, text });
        return 0;
    }, 'ii');
    L.ccall('lua_pushcclosure', null, ['number','number','number'], [L.luaState, ptrChat, 0]);
    L.ccall('lua_setglobal', null, ['number','string'], [L.luaState, 'host_chat']);

    // Ponte: DataStore
    const ptrSave = L.addFunction((s) => {
        const key = L.ccall('lua_tolstring', 'string', ['number','number'], [s, 1]);
        const json = L.ccall('lua_tolstring', 'string', ['number','number'], [s, 2]);
        self.postMessage({ type: 'datastore', key, data: JSON.parse(json) });
        return 0;
    }, 'ii');
    L.ccall('lua_pushcclosure', null, ['number','number','number'], [L.luaState, ptrSave, 0]);
    L.ccall('lua_setglobal', null, ['number','string'], [L.luaState, 'host_save_datastore']);

    // Ponte: Log e Loadstring
    const ptrLog = L.addFunction((s) => {
        const msg = L.ccall('lua_tolstring', 'string', ['number','number'], [s, 1]);
        self.postMessage({ type: 'log', msg });
        return 0;
    }, 'ii');
    L.ccall('lua_pushcclosure', null, ['number','number','number'], [L.luaState, ptrLog, 0]);
    L.ccall('lua_setglobal', null, ['number','string'], [L.luaState, 'host_log']);

    const ptrLoad = L.addFunction((s) => {
        const code = L.ccall('lua_tolstring', 'string', ['number','number'], [s, 1]);
        const r = L.ccall('luaL_loadstring', 'number', ['number','string'], [L.luaState, code]);
        if(r !== 0) { L.ccall('lua_pushnil', 'number', ['number'], [s]); return 1; }
        return 1;
    }, 'ii');
    L.ccall('lua_pushcclosure', null, ['number','number','number'], [L.luaState, ptrLoad, 0]);
    L.ccall('lua_setglobal', null, ['number','string'], [L.luaState, 'host_loadstring']);

    // Ambiente Roblox do Servidor
    const env = `
        loadstring = host_loadstring
        print = function(m) host_log(tostring(m)) end
        Instance = { new = function(c)
            local o = {Position={x=0,y=0,z=0}, Color="#ffffff"}
            setmetatable(o, { __newindex = function(t, k, v)
                rawset(t, k, v)
                if k == "Position" then host_create_part(v.x, v.y, v.z, t.Color) end
            end })
            return o
        end }
        game = { GetService = function(_, n)
            if n == "DataStoreService" then return { GetDataStore = function() return { SetAsync = function(_, k, d)
                local j = "{"; for a, b in pairs(d) do j = j .. '"'..a..'":'..tostring(b)..',' end
                host_save_datastore(k, j:sub(1, -2) .. "}")
            end } end } end
            if n == "Chat" then return { SendMessage = function(_, u, m) host_chat(u, m) end } end
            if n == "ReplicatedStorage" then return {} end
            if n == "ServerStorage" then return {} end
            if n == "ServerScriptService" then return {} end
            return {}
        end }
        ${e.data.code}
    `;
    L.ccall('luaL_loadstring', 'number', ['number','string'], [L.luaState, env]);
    L.ccall('lua_pcallk', 'number', ['number','number','number','number','number','number'], [L.luaState, 0, 0, 0, 0, 0]);
};
