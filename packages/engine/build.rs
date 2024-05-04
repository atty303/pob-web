fn main() {
    println!("cargo:rustc-link-arg=-o");
    println!("cargo:rustc-link-arg=target/pob_engine.mjs");
    println!("cargo:rustc-link-arg=--no-entry");
    println!("cargo:rustc-link-arg=-s");
    println!("cargo:rustc-link-arg=MODULARIZE=1");
    println!("cargo:rustc-link-arg=-s");
    println!("cargo:rustc-link-arg=ENVIRONMENT=web");
}