use mlua::Lua;

#[no_mangle]
pub fn test() {
    let lua = Lua::new();

    assert_eq!(lua.load("1 + 1").eval::<i32>().unwrap(), 3);
}