# wipmap-generate [<img src="https://github.com/chevalvert.png?size=100" align="right">](http://chevalvert.fr/)
> isomorphic JS module and cli tool to generate `wipmap` maps

## Installation

```sh
yarn add chevalvert/wipmap-generate
```

## Usage

###### CLI

```
wipmap-generate

Usage:
  wipmap-generate <X> <Y>
  wipmap-generate -x=<X> -y<Y>
  wipmap-generate <X> <Y> -o map.json
  wipmap-generate <X> <Y> -o map.json -o map.png
    
Options:
  -h, --help                    Show this screen.
  -v, --version                 Print the current version.
  -o, --output <file>           Write generated map in <file>.
```

###### Programmatic

```js
import wipmap from 'wipmap-generate'
const [x, y] = [0, 0]
const opts = {}
const map = wipmap(x, y, opts)
```

## License
[MIT.](https://tldrlegal.com/license/mit-license)
