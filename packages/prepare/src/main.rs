use imsz::Imsz;
use std::ffi::OsStr;
use std::fs;
use std::io::Write;
use std::path::Path;

fn visit_dirs<F: FnMut(&Path) + 'static>(dir: &Path, f: &mut F) -> std::io::Result<()> {
    if dir.is_dir() {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                visit_dirs(&path, f)?;
            } else {
                f(&path)
            }
        }
    }
    Ok(())
}

fn main() -> std::io::Result<()> {
    let base = Path::new("./vendor/PathOfBuilding/src");
    let mut out = fs::File::create("target/fs.tsv")?;
    let mut f = move |path: &Path| {
        if path.extension() == Some(OsStr::new("png"))
            || path.extension() == Some(OsStr::new("jpg"))
        {
            let rel_path = path
                .strip_prefix(&base)
                .unwrap()
                .display()
                .to_string()
                .replace("\\", "/");
            println!("{}\t{:?}", rel_path, path.imsz());
            let size = path.imsz().unwrap();
            write!(out, "{}\t{}\t{}\n", rel_path, size.width, size.height).unwrap();
        }
    };
    visit_dirs(&base, &mut f)
}
