{
  pkgs,
  ...
}:

{
  packages = with pkgs; [
    git
    zola
  ];
}
