use mlua::Lua;

#[no_mangle]
pub fn test() {
    let lua = Lua::new();

    let boot_lua = include_str!("../boot.lua");
    lua.load(boot_lua).exec().unwrap();

    assert_eq!(
        lua.load("print(\"Hello from Lua 2!\")")
            .eval::<i32>()
            .unwrap(),
        2
    );
}
