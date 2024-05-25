-- pob-web: Path of Building Web

package.path = package.path .. ";/app/root/lua/?.lua;/app/root/lua/?/init.lua"

unpack = table.unpack
loadstring = load

bit = {
    lshift = bit32.lshift,
    rshift = bit32.rshift,
    band = bit32.band,
    bor = bit32.bor,
    bxor = bit32.bxor,
    bnot = bit32.bnot,
}

if not setfenv then -- Lua 5.2
    -- based on http://lua-users.org/lists/lua-l/2010-06/msg00314.html
    -- this assumes f is a function
    local function findenv(f)
        local level = 1
        repeat
            local name, value = debug.getupvalue(f, level)
            if name == '_ENV' then return level, value end
            level = level + 1
        until name == nil
        return nil end
    getfenv = function (f) return(select(2, findenv(f)) or _G) end
    setfenv = function (f, t)
        local level = findenv(f)
        if level then debug.setupvalue(f, level, t) end
        return f end
end

arg = {}

-- Rendering
function RenderInit()
end
function SetClearColor(r, g, b, a)
end
function StripEscapes(text)
    return text:gsub("%^%d", ""):gsub("%^x%x%x%x%x%x%x", "")
end
function GetAsyncCount()
    return 0
end

-- General Functions
function SetCursorPos(x, y)
end
function ShowCursor(doShow)
end
function GetScriptPath()
    return "."
end
function GetRuntimePath()
    return ""
end
function GetUserPath()
    return "/app/user"
end
function SetWorkDir(path)
    print("SetWorkDir: " .. path)
end
function GetWorkDir()
    return ""
end
function LoadModule(fileName, ...)
    if not fileName:match("%.lua") then
        fileName = fileName .. ".lua"
    end
    local func, err = loadfile(fileName)
    if func then
        return func(...)
    else
        error("LoadModule() error loading '" .. fileName .. "': " .. err)
    end
end
function PLoadModule(fileName, ...)
    if not fileName:match("%.lua") then
        fileName = fileName .. ".lua"
    end
    local func, err = loadfile(fileName)
    if func then
        return PCall(func, ...)
    else
        error("PLoadModule() error loading '" .. fileName .. "': " .. err)
    end
end

local debug = require "debug"
function PCall(func, ...)
    local ret = { xpcall(func, debug.traceback, ...) }
    if ret[1] then
        table.remove(ret, 1)
        return nil, unpack(ret)
    else
        return ret[2]
    end
end

function ConPrintf(fmt, ...)
    -- Optional
    print(string.format(fmt, ...))
end
function ConPrintTable(tbl, noRecurse)
end
function ConExecute(cmd)
end
function ConClear()
end
function SpawnProcess(cmdName, args)
end
function SetProfiling(isEnabled)
end
function Restart()
end
function Exit()
end

dofile("Launch.lua")

--
-- pob-web related custom code
--
local mainObject = GetMainObject()

-- Disable the check for updates because we can't update the app
mainObject["CheckForUpdate"] = function(this)
end

-- Install the error handler
local showErrMsg = mainObject["ShowErrMsg"]
mainObject["ShowErrMsg"] = function(self, msg, ...)
    OnError(string.format(msg, ...))
    showErrMsg(self, msg, ...)
end

-- Hide the check for updates button
local onInit = mainObject["OnInit"]
mainObject["OnInit"] = function(self)
    onInit(self)
    self.main.controls.checkUpdate.shown = function()
        return false
    end
end

local function runCallback(name, ...)
    local callback = GetCallback(name)
    return callback(...)
end

function loadBuildFromCode(code)
    mainObject.main:SetMode("BUILD", false, "")
    mainObject.main.modes["BUILD"].importTab.controls.importCodeIn:SetText(code, true)
    mainObject.main.modes["BUILD"].importTab.controls.importCodeGo.onClick()
end
