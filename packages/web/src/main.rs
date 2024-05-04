use dioxus::prelude::*;

fn app() -> Element {
    rsx! {
        div {
            "Hello, world!"
        }
    }
}

fn main() {
    launch(app);
}
