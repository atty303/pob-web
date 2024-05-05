use std::ffi::CString;

use mlua::{Error, Lua, Table, Value};

extern "C" {
    pub fn emscripten_run_script(script: *const std::os::raw::c_char);
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

fn init_engine(lua: &Lua) -> Result<(), Error> {
    let globals = lua.globals();

    globals.set(
        "SetDrawColor",
        lua.create_function(
            |_, (r0, g0, b0, a): (Value, Option<f32>, Option<f32>, Option<f32>)| {
                let (r, g, b) = match r0 {
                    Value::Number(n) => (n as f32, g0.unwrap_or(0.0), b0.unwrap_or(0.0)),
                    Value::Integer(n) => (n as f32, g0.unwrap_or(0.0), b0.unwrap_or(0.0)),
                    Value::String(ref t) => {
                        let s = t.to_str().unwrap();
                        let mut it = s.chars();
                        if it.next() == Some('^') {
                            let c2 = it.next();
                            if c2.map(|c| c.is_digit(10)).unwrap_or(false) {
                                c2.unwrap()
                                    .to_digit(10)
                                    .map(|i| COLOR_ESCAPES[i as usize])
                                    .unwrap()
                            } else if c2 == Some('x') || c2 == Some('X') {
                                let s = &s[2..];
                                let n = u32::from_str_radix(s, 16).unwrap();
                                let r = ((n >> 16) & 0xff) as f32 / 255.0;
                                let g = ((n >> 8) & 0xff) as f32 / 255.0;
                                let b = (n & 0xff) as f32 / 255.0;
                                (r, g, b)
                            } else {
                                return Err(Error::RuntimeError(format!(
                                    "SetDrawColor: r must be a number: {:?}",
                                    r0
                                )));
                            }
                        } else {
                            return Err(Error::RuntimeError(format!(
                                "SetDrawColor: r must be a number: {:?}",
                                r0
                            )));
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
                unsafe {
                    emscripten_run_script(script.as_ptr());
                }
                Ok(())
            },
        )?,
    )?;

    globals.set(
        "DrawImage",
        lua.create_function(
            |_,
             (image, left, top, width, height, tc_left, tc_top, tc_right, tc_bottom): (
                Option<Table>,
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
                    "DrawImage({}, {}, {}, {}, {}, {}, {}, {})",
                    // image,
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
                    emscripten_run_script(script.as_ptr());
                }
                Ok(())
            },
        )?,
    )?;

    Ok(())
}

#[no_mangle]
pub fn test() {
    let lua = Lua::new();
    init_engine(&lua).unwrap();

    let boot_lua = include_str!("../boot.lua");
    match lua.load(boot_lua).exec() {
        Ok(_) => {}
        Err(e) => {
            eprintln!("Error: {}", e);
        }
    }
}
