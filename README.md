# wmnet

macOS network gateway switcher — beautiful terminal UI.

## Install

```bash
curl -L https://github.com/WinterMorning/wmnet/releases/latest/download/wmnet -o ~/.local/bin/wmnet
chmod +x ~/.local/bin/wmnet
wmnet
```

## Usage

```
wmnet                      interactive mode
wmnet status               show network status
wmnet switch <profile>     direct switch
wmnet list                 list profiles
wmnet add --name "x" --gateway 192.168.x.x
wmnet edit <id> --no-dhcp --static-ip 192.168.x.x --subnet 255.255.255.0
wmnet delete <id>
wmnet undo                 revert last switch
wmnet theme <name>         cyan | sunset | forest | purple | rose | monochrome
wmnet settings             toggle confirmBeforeSwitch
```

## Config

`~/.config/wmnet/profiles.yaml`

## Build

```bash
bun install
bun run build
bun run compile
```
