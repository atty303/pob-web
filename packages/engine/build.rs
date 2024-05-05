fn main() {
    println!("cargo:rustc-link-arg=-o");
    println!("cargo:rustc-link-arg=target/pob_engine.mjs");

    // println!("cargo:rustc-link-arg=-O3");
    println!("cargo:rustc-link-arg=--no-entry");

    println!("cargo:rustc-link-arg=--preload-file");
    println!("cargo:rustc-link-arg=vendor/PathOfBuilding/src@/");

    println!("cargo:rustc-link-arg=--preload-file");
    println!("cargo:rustc-link-arg=vendor/PathOfBuilding/runtime/lua@/");

    println!("cargo:rustc-link-arg=--exclude-file");
    println!("cargo:rustc-link-arg=*.png");

    println!("cargo:rustc-link-arg=--exclude-file");
    println!("cargo:rustc-link-arg=*.jpg");

    println!("cargo:rustc-link-arg=-s");
    println!("cargo:rustc-link-arg=MODULARIZE=1");

    println!("cargo:rustc-link-arg=-s");
    println!("cargo:rustc-link-arg=ENVIRONMENT=web");

    println!("cargo:rustc-link-arg=-s");
    println!("cargo:rustc-link-arg=ALLOW_MEMORY_GROWTH");

    println!("cargo:rustc-link-arg=-s");
    println!("cargo:rustc-link-arg=ASYNCIFY");
}
