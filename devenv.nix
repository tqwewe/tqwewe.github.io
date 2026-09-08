{
  pkgs,
  ...
}:

let
  # nixpkgs ships 0.22.1, but the theme templates are Tera 2, which needs Zola 0.23+.
  zola = pkgs.stdenv.mkDerivation rec {
    pname = "zola";
    version = "0.23.4";

    src = pkgs.fetchurl {
      url = "https://github.com/getzola/zola/releases/download/v${version}/zola-v${version}-x86_64-unknown-linux-gnu.tar.gz";
      hash = "sha256-VNGjR3gbLzIzCRT8wC3vgcfj3bYRGzbRzInAZVeu0d4=";
    };

    sourceRoot = ".";
    nativeBuildInputs = [ pkgs.autoPatchelfHook ];
    buildInputs = [ pkgs.stdenv.cc.cc.lib ];

    installPhase = ''
      install -Dm755 zola $out/bin/zola
    '';
  };
in
{
  packages = [
    pkgs.git
    zola
  ];
}
