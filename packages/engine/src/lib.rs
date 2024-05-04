use mlua::{Error, Lua};

fn init_engine(lua: &Lua) -> Result<(), Error> {
    // let bit = lua.create_table()?;
    //
    // bit.set(
    //     "band",
    //     lua.create_function(|_, args: Variadic<f32>| {
    //         args.iter()
    //             .map(|a| *a as u32)
    //             .reduce(|a, b| a & b)
    //             .ok_or(Error::runtime("at least one argument is required"))
    //     })?,
    // )?;
    // bit.set(
    //     "bor",
    //     lua.create_function(|_, args: Variadic<f32>| {
    //         args.iter()
    //             .map(|a| *a as u32)
    //             .reduce(|a, b| a | b)
    //             .ok_or(Error::runtime("at least one argument is required"))
    //     })?,
    // )?;
    // bit.set(
    //     "bxor",
    //     lua.create_function(|_, args: Variadic<f32>| {
    //         args.iter()
    //             .map(|a| *a as u32)
    //             .reduce(|a, b| a ^ b)
    //             .ok_or(Error::runtime("at least one argument is required"))
    //     })?,
    // )?;
    // bit.set(
    //     "bnot",
    //     lua.create_function(|_, arg: f32| Ok(!(arg as u32)))?,
    // )?;
    // bit.set(
    //     "rshift",
    //     lua.create_function(|_, (value, n): (f32, f32)| Ok((value as u32) >> ((n as u32) & 31)))?,
    // )?;
    //
    // lua.globals().set("bit", bit)?;

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
