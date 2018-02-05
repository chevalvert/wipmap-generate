# wipmap-generate [<img src="https://github.com/chevalvert.png?size=100" align="right">](http://chevalvert.fr/)

*wipmap map generate*

<br>

## Installation

```sh
npm install -S chevalvert/wipmap-generate
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
const map = wipmap(x, y)
```

## License
[MIT.](https://tldrlegal.com/license/mit-license)
