use mlua::Lua;

#[no_mangle]
pub fn test() {
    let lua = Lua::new();

    assert_eq!(
        lua.load("print(\"Hello from Lua 2!\")")
            .eval::<i32>()
            .unwrap(),
        2
    );
}
