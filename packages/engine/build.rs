fn main() {
    println!("cargo:rustc-link-arg=-o");
    println!("cargo:rustc-link-arg=target/pob_engine.mjs");

    println!("cargo:rustc-link-arg=-O3");

    println!("cargo:rustc-link-arg=--no-entry");

    println!("cargo:rustc-link-arg=--preload-file");
    println!("cargo:rustc-link-arg=target/vfs@/");

    println!("cargo:rustc-link-arg=-s");
    println!("cargo:rustc-link-arg=MODULARIZE=1");

    println!("cargo:rustc-link-arg=-s");
    println!("cargo:rustc-link-arg=ENVIRONMENT=web");

    println!("cargo:rustc-link-arg=-s");
    println!("cargo:rustc-link-arg=ALLOW_MEMORY_GROWTH");

    // println!("cargo:rustc-link-arg=-s");
    // println!("cargo:rustc-link-arg=ASYNCIFY");

    // println!("cargo:rustc-link-arg=-s");
    // println!("cargo:rustc-link-arg=MALLOC=emmalloc");

    println!("cargo:rustc-link-arg=-s");
    println!("cargo:rustc-link-arg=CASE_INSENSITIVE_FS");

    println!("cargo:rustc-link-arg=-s");
    println!("cargo:rustc-link-arg=EVAL_CTORS");
}
