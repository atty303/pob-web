-- This wrapper allows the program to run headless on any OS (in theory)
-- It can be run using a standard lua interpreter, although LuaJIT is preferable

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

local sha1 = require("sha1.init")
package.loaded["sha1"] = sha1

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

-- Search Handles
function NewFileSearch()
end

-- General Functions
function SetWindowTitle(title)
end
function SetCursorPos(x, y)
end
function ShowCursor(doShow)
end
function GetScriptPath()
    return ""
end
function GetRuntimePath()
    return ""
end
function GetUserPath()
    return ""
end
function MakeDir(path)
end
function RemoveDir(path)
end
function SetWorkDir(path)
end
function GetWorkDir()
    return ""
end
function LaunchSubScript(scriptText, funcList, subList, ...)
end
function AbortSubScript(ssID)
end
function IsSubScriptRunning(ssID)
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
function OpenURL(url)
end
function SetProfiling(isEnabled)
end
function Restart()
end
function Exit()
end

local l_require = require
function require(name)
    -- Hack to stop it looking for lcurl, which we don't really need
    if name == "lcurl.safe" then
        return
    end
    return l_require(name)
end

dofile("Launch.lua")

-- Inject error handler
local mainObject = GetMainObject()

local showErrMsg = mainObject["ShowErrMsg"]
mainObject["ShowErrMsg"] = function(this, msg, ...)
    OnError(string.format(msg, ...))
    showErrMsg(this, msg, ...)
end
