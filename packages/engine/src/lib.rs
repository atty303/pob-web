use std::collections::HashMap;
use std::ffi::CString;
use std::sync::atomic::AtomicI32;
use std::sync::{Arc, Mutex};

use mlua::{Error, FromLua, Lua, UserData, Value, Variadic};
use once_cell::sync::Lazy;

extern "C" {
    pub fn emscripten_run_script(script: *const std::os::raw::c_char);
    pub fn emscripten_run_script_int(script: *const std::os::raw::c_char) -> i32;
}

fn escape_js(input: &str) -> String {
    let escaped = input
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t");
    format!("\"{}\"", escaped)
}

// static IMAGE_META_TSV: &'static str = include_str!("../../../target/fs.tsv");
static IMAGE_META: Lazy<HashMap<String, (i32, i32)>> = Lazy::new(|| {
    let tsv = include_str!("../../../target/fs.tsv");
    let lines = tsv.lines().map(|line| {
        let mut xs = line.split('\t');
        let name = xs.next().unwrap();
        let width: i32 = xs.next().unwrap().parse().unwrap();
        let height: i32 = xs.next().unwrap().parse().unwrap();
        (name.to_string(), (width, height))
    });
    HashMap::from_iter(lines)
});

static IMAGE_HANDLE_DATA: Lazy<Mutex<HashMap<i32, ImageHandleData>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

struct ImageHandleData {
    width: i32,
    height: i32,
}

struct ImageHandle {
    handle: i32,
    width: i32,
    height: i32,
}

impl ImageHandle {
    fn new() -> Self {
        static NEXT_HANDLE: AtomicI32 = AtomicI32::new(1);
        let handle = NEXT_HANDLE.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        IMAGE_HANDLE_DATA.lock().unwrap().insert(
            handle,
            ImageHandleData {
                width: 1,
                height: 1,
            },
        );
        ImageHandle {
            handle,
            width: 1,
            height: 1,
        }
    }
}

impl UserData for ImageHandle {
    fn add_methods<'lua, M: mlua::UserDataMethods<'lua, Self>>(methods: &mut M) {
        methods.add_method_mut(
            "Load",
            |_, this, (name, _args): (String, Variadic<Option<String>>)| {
                // println!("ImageHandle:Load: {}, {:?}", name, args);
                let (width, height) = IMAGE_META.get(&name).unwrap_or_else(|| {
                    println!("ImageHandle:Load: not found: {}", name);
                    &(1, 1)
                });
                this.width = *width;
                this.height = *height;
                let script =
                    CString::new(format!(r#"ImageHandleLoad({}, "{}")"#, this.handle, &name,))
                        .unwrap();
                unsafe { Ok(emscripten_run_script(script.as_ptr())) }
            },
        );
        methods.add_method_mut("Unload", |_, _this, ()| Ok(()));
        methods.add_method("IsValid", |_, _this, ()| Ok(true));
        methods.add_method("SetLoadingPriority", |_, _this, (_,): (i32,)| Ok(()));
        methods.add_method("ImageSize", |_, this, ()| {
            // println!("ImageHandle:ImageSize");
            // let data = IMAGE_HANDLE_DATA.lock().unwrap();
            // data.get(&this.handle)
            //     .map_or_else(|| Ok((1, 1)), |this| Ok((this.width, this.height)))
            Ok((this.width, this.height))
        });
    }
}

impl<'lua> FromLua<'lua> for ImageHandle {
    fn from_lua(value: Value<'lua>, _lua: &'lua Lua) -> mlua::Result<Self> {
        // println!("FromLua: {:?}", value.as_userdata().unwrap());
        let a = value.as_userdata().unwrap();
        let b = a.borrow::<ImageHandle>().unwrap();
        // println!("FromLua: {:?}", b.handle);
        Ok(ImageHandle {
            handle: b.handle,
            width: b.width,
            height: b.height,
        })
    }
}

static COLOR_ESCAPES: [(f32, f32, f32); 10] = [
    (0.0, 0.0, 0.0),
    (1.0, 0.0, 0.0),
    (0.0, 1.0, 0.0),
    (0.0, 0.0, 1.0),
    (1.0, 1.0, 0.0),
    (1.0, 0.0, 1.0),
    (0.0, 1.0, 1.0),
    (1.0, 1.0, 1.0),
    (0.7, 0.7, 0.7),
    (0.4, 0.4, 0.4),
];

fn parse_color(s: &str) -> Option<((f32, f32, f32), usize)> {
    let mut it = s.chars();
    if it.next() == Some('^') {
        let c2 = it.next();
        if c2.map_or(false, |c| c.is_digit(10)) {
            let i = c2.and_then(|c| c.to_digit(10)).unwrap();
            let t = COLOR_ESCAPES[i as usize];
            Some((t, 2))
        } else if c2 == Some('x') || c2 == Some('X') {
            let s = &s[2..8];
            let n = u32::from_str_radix(s, 16).unwrap();
            let r = ((n >> 16) & 0xff) as f32 / 255.0;
            let g = ((n >> 8) & 0xff) as f32 / 255.0;
            let b = (n & 0xff) as f32 / 255.0;
            Some(((r, g, b), 8))
        } else {
            None
        }
    } else {
        None
    }
}

fn init_engine(lua: &Lua) -> Result<(), Error> {
    let globals = lua.globals();

    // image
    globals.set(
        "NewImageHandle",
        lua.create_function(|_, ()| Ok(ImageHandle::new()))?,
    )?;

    // render
    globals.set(
        "SetDrawLayer",
        lua.create_function(|_, (layer, sub): (Option<i32>, Option<i32>)| {
            let script = CString::new(format!(
                r#"SetDrawLayer({}, {})"#,
                layer.map_or("undefined".to_string(), |l| l.to_string()),
                sub.map_or("undefined".to_string(), |l| l.to_string()),
            ))
            .unwrap();
            unsafe {
                // emscripten_run_script(script.as_ptr());
            }
            Ok(())
        })?,
    )?;

    globals.set(
        "SetViewport",
        lua.create_function(
            |_, (x, y, width, height): (Option<f32>, Option<f32>, Option<f32>, Option<f32>)| {
                let script = CString::new(format!(
                    r#"SetViewport({}, {}, {}, {})"#,
                    x.unwrap_or(0.0),
                    y.unwrap_or(0.0),
                    width.unwrap_or(1920.0),
                    height.unwrap_or(1080.0)
                ))
                .unwrap();
                unsafe {
                    // emscripten_run_script(script.as_ptr());
                }
                Ok(())
            },
        )?,
    )?;

    globals.set(
        "SetDrawColor",
        lua.create_function(
            |_, (r0, g0, b0, a): (Value, Option<f32>, Option<f32>, Option<f32>)| {
                let (r, g, b) = match r0 {
                    Value::Number(n) => (n as f32, g0.unwrap_or(0.0), b0.unwrap_or(0.0)),
                    Value::Integer(n) => (n as f32, g0.unwrap_or(0.0), b0.unwrap_or(0.0)),
                    Value::String(ref t) => {
                        let s = t.to_str().unwrap();
                        match parse_color(s) {
                            Some((t, _)) => t,
                            None => {
                                return Err(Error::RuntimeError(format!(
                                    "SetDrawColor: r must be a number: {:?}",
                                    r0
                                )))
                            }
                        }
                    }
                    _ => {
                        return Err(Error::RuntimeError(format!(
                            "SetDrawColor: r must be a number: {:?}",
                            r0
                        )))
                    }
                };
                let script = CString::new(format!(
                    "SetDrawColor({}, {}, {}, {})",
                    r,
                    g,
                    b,
                    a.unwrap_or(1.0)
                ))
                .unwrap();
                // unsafe { emscripten_run_script(script.as_ptr()); }
                Ok(())
            },
        )?,
    )?;

    globals.set(
        "DrawImage",
        lua.create_function(
            |_,
             (image, left, top, width, height, tc_left, tc_top, tc_right, tc_bottom): (
                Option<ImageHandle>,
                f32,
                f32,
                f32,
                f32,
                Option<f32>,
                Option<f32>,
                Option<f32>,
                Option<f32>,
            )| {
                let script = CString::new(format!(
                    "DrawImage({}, {}, {}, {}, {}, {}, {}, {}, {})",
                    image.map(|i| i.handle).unwrap_or(0),
                    left,
                    top,
                    width,
                    height,
                    tc_left.unwrap_or(0.0),
                    tc_top.unwrap_or(0.0),
                    tc_right.unwrap_or(1.0),
                    tc_bottom.unwrap_or(1.0)
                ))
                .unwrap();
                unsafe {
                    // emscripten_run_script(script.as_ptr());
                }
                Ok(())
            },
        )?,
    )?;

    globals.set(
        "DrawString",
        lua.create_function(
            |_,
             (x, y, align, height, font, text): (
                f32,
                f32,
                Option<String>,
                f32,
                String,
                String,
            )| {
                let t = match parse_color(&text) {
                    Some(((r, g, b), n)) => {
                        let script = CString::new(format!(
                            "SetDrawColor({}, {}, {}, {})",
                            r,
                            g,
                            b,
                            1.0
                        ))
                            .unwrap();
                        unsafe {
                            // emscripten_run_script(script.as_ptr());
                        }
                        &text[n..]
                    }
                    None => &text,
                };

                let script = CString::new(format!(
                    r#"DrawString({}, {}, "{}", {}, "{}", {})"#,
                    x,
                    y,
                    align.unwrap_or("LEFT".to_string()),
                    height,
                    font,
                    escape_js(t),
                ))
                .unwrap();
                unsafe {
                    // emscripten_run_script(script.as_ptr());
                }
                Ok(())
            },
        )?,
    )?;

    globals.set(
        "DrawStringWidth",
        lua.create_function(|_, (height, font, text): (f32, String, String)| {
            let script = format!(
                r#"DrawStringWidth({}, "{}", {})"#,
                height,
                &font,
                escape_js(&text),
            );
            let script = CString::new(script).unwrap();
            unsafe { Ok(emscripten_run_script_int(script.as_ptr())) }
        })?,
    )?;

    Ok(())
}

static LUA: Lazy<Arc<Mutex<Lua>>> = Lazy::new(|| Arc::new(Mutex::new(Lua::new())));

#[no_mangle]
pub fn test() {
    let lua = LUA.lock().unwrap();
    init_engine(&lua).unwrap();

    let boot_lua = include_str!("../boot.lua");
    match lua.load(boot_lua).exec() {
        Ok(_) => {}
        Err(e) => {
            eprintln!("Error: {}", e);
        }
    }
}

#[no_mangle]
pub fn on_frame() {
    let lua = LUA.lock().unwrap();
    lua.load(r#"runCallback("OnFrame")"#).exec().unwrap();
}

#[no_mangle]
pub fn on_image_load(handle: i32, width: i32, height: i32) {
    match IMAGE_HANDLE_DATA.lock().unwrap().get_mut(&handle) {
        Some(image) => {
            image.width = width;
            image.height = height;
        }
        None => {}
    }
}
