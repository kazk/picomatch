'use strict';

module.exports = (str, options = {}, negated) => {
  let prefix = '^' + (options.prefix || '');

  if (str.slice(0, 2) === './') {
    str = str.slice(2);
  }

  let dot = false;
  let idx = -1;
  let ch;
  let lastChar;
  let qmark = '[^/]';
  let qmarkNoDot = '[^/.]';
  let star = () => options.star || `${qmark}*?`;

  let ast = { type: 'root', nodes: [] };
  let chars = [...str];
  let extglobs = [];
  let queue = [];
  let stack = [];
  let stacks = {
    all: [],
    angles: [],
    braces: [],
    brackets: [],
    parens: [],
    quotes: [],
    other: [],
    length: 0,
    last() {
      return this.all[this.all.length - 1];
    },
    push(type, value) {
      this.length++;
      stack.push({type, value: ''});
      this.all.push(value);
      this[type].push(value);
      return value;
    },
    pop(type) {
      this.length--;
      stack.pop();
      this.all.pop();
      return this[type].pop();
    }
  };

  const stash = [{ type: 'bos', value: '' }];
  const seen = [];
  const state = {
    negated,
    prefix,
    suffix: (options.suffix || '') + '$',
    hasGlobstar: false,
    stash,
    stacks,
    queue,
    extglobs,
    seen
  };

  const start = dot => {
    return dot ? '' : (options.dot ? '(?!(?:^|\\/)\\.{1,2}(?:$|\\/))' : '(?!\\.)');
  };

  const globstar = dot => {
    if (dot || options.dot === true) {
      return '(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?';
    }
    return '(?:(?!(?:\\/|^)\\.).)*?';
  };

  const eos = () => idx >= chars.length;
  const isInside = type => type ? stacks[type].length > 0 : stacks.length > 0;
  const consume = n => {
    if (ch) seen.push(ch);
    return !eos() ? (idx += n) : false;
  };
  const advance = () => consume(1) !== false ? chars[idx] : '';
  const enqueue = val => queue.push(val);
  const dequeue = () => queue.length && queue.shift();
  const lookahead = n => {
    let fetch = n - queue.length;
    while (fetch-- > 0 && enqueue(advance()));
    return queue[--n];
  };
  const lookbehind = n => stash[stash.length - Math.abs(n)];
  const rest = () => chars.slice(idx);
  const prev = () => lookbehind(1);
  const peek = () => lookahead(1) || '';
  const next = () => {
    lastChar = ch;
    return (ch = dequeue() || advance() || '');
  };
  const last = arr => arr[arr.length - 1];
  const append = val => {
    let prev = last(stash);
    let after = rest();

    if (prev.optional === true && !after.includes('*')) {
      if (prev.value === '' && after.length) {
      // console.log(prev)
        // prev.value = '?';
      } else if (!after.length) {
        // if (prev.value === '(?=.)/?') prev.value = '';
        // val += '/?';
      }
    }

    if (stack.length) {
      stack[stack.length - 1].value += (val || '');
    }
    stash[stash.length - 1].value += (val || '');
  };

  function parse() {
    if (eos()) return;
    let prior;
    let extglob;
    let tok;
    next();

    switch (ch) {
      case '\\':
        append(ch + next());
        break;
      case '/':
        tok = prev();
        stash.push({ type: 'slash', value: '', optional: tok.globstar });
        break;
      case '"':
      case "'":
      case '`':
        if (last(stacks.quotes) !== ch) {
          stacks.push('quotes', ch);
        } else {
          stacks.pop('quotes');
        }
        append(ch);
        break;
      case '“':
        stacks.push('quotes', ch);
        append(ch);
        break;
      case '”':
        stacks.pop('quotes');
        append(ch);
        break;
      case '(':
      case '<':
      case '{':
      case '[':
        if (stacks.length) {
          append(ch);
        } else {
          switch (ch) {
            case '(':
              stacks.push('parens', ch);
              switch (last(extglobs)) {
                case '!':
                  ch = '(?:(?!(?:';
                  break;
                case '*':
                case '+':
                case '?':
                case '@': {
                  ch = '(?:';
                  break;
                }
              }
              break;
            case '<':
              stacks.push('angles', ch);
              break;
            case '{':
              stacks.push('braces', ch);
              break;
            case '[': {
              append('(?:');
              stacks.push('brackets', ch);
              break;
            }
          }

          append(ch);
        }
        break;
      case ')':
      case '>':
      case '}':
      case ']':
        if (!stacks.length) {
          throw new Error('missing opening: ' + ch);
        }

        if (/[[({<]/.test(stacks.last())) {
          if (ch === ')') {
            extglob = extglobs.pop();
            prior = prev();

            if (extglob) {
              prior.extglob = true;
            } else {
              prior.capture = true;
            }

            switch (extglob) {
              case '!':
                append(`)${peek() ? '' : '$'})${star()})`);
                break;
              case '*':
              case '+':
              case '?':
                append(ch + extglob);
                break;
              case '@':
              default: {
                append(ch);
                break;
              }
            }
          } else {
            if (ch === ']') {
              let bracket = stack[stack.length - 1];
              append(`${ch}|\\${bracket.value}\\])`);
            } else {
              append(ch);
            }
          }

          stacks.pop(stackType(ch));
        } else {
          append(ch);
        }
        break;
      case '.':
        prior = prev();

        if (lastChar === '' || lastChar === '/') {
          dot = true;
        }

        append('\\' + ch);
        prior.dot = true;
        break;
      case '!':
        if (stash.length === 1 && prev().value === '' && peek() !== '(') {
          state.prefix = '^(?!' + state.prefix;
          state.suffix += ').*$';
          state.negated = true;
          break;
        }
        /* fall through */
      case '@':
      case '?':
      case '*':
      case '+':
        let nextChar = peek();
        if (nextChar === '(') {
          extglobs.push(ch);
          break;
        }

        prior = prev();

        if (ch === '+') {
          append((/(^$|\w$)/.test(prior.value) ? '\\' : '') + ch);
          break;
        }

        if (ch === '*') {
          let isGlobstar = false;

          while (peek() === '*') {
            isGlobstar = state.hasGlobstar = true;
            dequeue();
          }

          if (isGlobstar) {
            prior.globstar = true;
            // if (lastChar === '/') append('?');
            append(globstar(dot));
            dot = false;
            break;
          }

          if (prior.type === 'slash' && !isGlobstar) {
            let after = rest();

            if (prior.optional === true && prior.value === '' && after.length) {
              // prior.value = '?';
            }

            if (lastChar === '/' && after[0] !== '.') {
              append(start(dot));
            }
          }

          append(star());
          break;
        }

        if (ch === '?') {
          if (lastChar === '(') {
            break;
          }

          if (lastChar === '/' && !dot) {
            append('[^./]');
            break;
          }

          append(qmark);
          break;
        }

        append('\\' + ch);
        break;
      case ':':
        prev().capture = true;
        break;
      case '~':
      case '&':
        append(ch);
        break;

      default: {
        append(ch);
        break;
      }
    }

    parse();
  }

  parse();

  const first = state.stash[0];
  if (!state.negated && !dot && first.globstar !== true) {
    first.value = '(?!\\.)' + first.value;
  }

  return state;
};

function stackType(ch) {
  switch (ch) {
    case '<':
    case '>':
      return 'angles';
    case '{':
    case '}':
      return 'braces';
    case '[':
    case ']':
      return 'brackets';
    case '(':
    case ')':
      return 'parens';
    default: {
      return 'other';
    }
  }
}