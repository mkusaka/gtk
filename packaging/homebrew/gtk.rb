class Gtk < Formula
  desc "BYO-credentials Google Tasks CLI"
  homepage "https://github.com/mkusaka/gtk"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "__DARWIN_ARM64_URL__"
      sha256 "__DARWIN_ARM64_SHA256__"
    else
      url "__DARWIN_X64_URL__"
      sha256 "__DARWIN_X64_SHA256__"
    end
  end

  version "__VERSION__"
  head "https://github.com/mkusaka/gtk.git", branch: "main"

  head do
    depends_on "deno" => :build
    depends_on "node" => :build
    depends_on "pnpm" => :build
  end

  def install
    if build.head?
      target = Hardware::CPU.arm? ? "aarch64-apple-darwin" : "x86_64-apple-darwin"
      system "pnpm", "install", "--frozen-lockfile"
      system "pnpm", "build"
      system "pnpm", "prune", "--prod"
      system "deno", "compile", "--no-lock", "-A", "--node-modules-dir=auto", "--target=#{target}", "--output", "gtk", "dist/index.js"
    end

    bin.install "gtk"
    (pkgshare/"skills").install Dir["skills/*"]
  end

  def caveats
    skill_path = opt_pkgshare/"skills"
    <<~EOS
      Optional agent skills were installed to:
        #{skill_path}

      Install from the packaged skill files with npx skills:
        npx -y skills add "#{skill_path}" --skill gtk-google-tasks -y --copy

      Install from the repository with npx skills:
        npx -y skills add https://github.com/mkusaka/gtk --skill gtk-google-tasks -y

      Install from GitHub CLI v2.90.0+:
        gh skill install mkusaka/gtk gtk-google-tasks

      Add `--agent <host>` if you want to target a specific agent host.
    EOS
  end

  test do
    assert_match "BYO-credentials Google Tasks CLI", shell_output("#{bin}/gtk --help")
  end
end
