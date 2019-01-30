'use strict';

require('mocha');
const path = require('path');
const assert = require('assert');
const fill = require('fill-range');
const picomatch = require('..');
const { isMatch } = picomatch;

describe('special characters', () => {
  beforeEach(() => picomatch.clearCache());
  afterEach(() => picomatch.clearCache());

  // See micromatch#127
  describe('unicode', () => {
    it('should match Japanese characters', () => {
      assert(isMatch('フォルダ/aaa.js', 'フ*/**/*'));
      assert(isMatch('フォルダ/aaa.js', 'フォ*/**/*'));
      assert(isMatch('フォルダ/aaa.js', 'フォル*/**/*'));
      assert(isMatch('フォルダ/aaa.js', 'フ*ル*/**/*'));
      assert(isMatch('フォルダ/aaa.js', 'フォルダ/**/*'));
    });
  });

  describe('numbers', () => {
    it('should match numbers in the input string', () => {
      assert(!isMatch('1', '*/*'));
      assert(isMatch('1/1', '*/*'));
      assert(isMatch('1/2', '*/*'));
      assert(!isMatch('1/1/1', '*/*'));
      assert(!isMatch('1/1/2', '*/*'));

      assert(!isMatch('1', '*/*/1'));
      assert(!isMatch('1/1', '*/*/1'));
      assert(!isMatch('1/2', '*/*/1'));
      assert(isMatch('1/1/1', '*/*/1'));
      assert(!isMatch('1/1/2', '*/*/1'));

      assert(!isMatch('1', '*/*/2'));
      assert(!isMatch('1/1', '*/*/2'));
      assert(!isMatch('1/2', '*/*/2'));
      assert(!isMatch('1/1/1', '*/*/2'));
      assert(isMatch('1/1/2', '*/*/2'));
    });
  });

  describe('qmarks', () => {
    it('should match literal ? in the input string', () => {
      assert(isMatch('?', '*'));
      assert(isMatch('/?', '/*'));
      assert(isMatch('?/?', '*/*'));
      assert(isMatch('?/?/', '*/*/'));
      assert(isMatch('/?', '/?'));
      assert(isMatch('?/?', '?/?'));
      assert(isMatch('foo?/bar?', '*/*'));
    });

    it('should not match slashes with qmarks', () => {
      assert(!isMatch('aaa/bbb', 'aaa?bbb'));
    });

    it('should match literal ? with qmarks', () => {
      assert(!isMatch('?', '??'));
      assert(!isMatch('?', '???'));
      assert(!isMatch('??', '?'));
      assert(!isMatch('??', '???'));
      assert(!isMatch('???', '?'));
      assert(!isMatch('???', '??'));
      assert(!isMatch('ac?', 'ab?'));
      assert(isMatch('?', '?*'));
      assert(isMatch('??', '?*'));
      assert(isMatch('???', '?*'));
      assert(isMatch('????', '?*'));
      assert(isMatch('?', '?'));
      assert(isMatch('??', '??'));
      assert(isMatch('???', '???'));
      assert(isMatch('ab?', 'ab?'));
    });

    it('should match other non-slash characters with qmarks', () => {
      assert(!isMatch('/a/', '?'));
      assert(!isMatch('/a/', '??'));
      assert(!isMatch('/a/', '???'));
      assert(!isMatch('/a/b/', '??'));
      assert(!isMatch('aaa/bbb', 'aaa?bbb'));
      assert(!isMatch('aaa//bbb', 'aaa?bbb'));
      assert(!isMatch('aaa\\\\bbb', 'aaa?bbb'));
      assert(isMatch('acb/', 'a?b/'));
      assert(isMatch('acdb/', 'a??b/'));
      assert(isMatch('/acb', '/a?b'));
    });

    it('should match non-slash characters when options.qmarkLiteral is true', () => {
      assert(!isMatch('acb/', 'a?b/', { qmarkLiteral: true }));
      assert(!isMatch('acdb/', 'a??b/', { qmarkLiteral: true }));
      assert(!isMatch('/acb', '/a?b', { qmarkLiteral: true }));
    });

    it('should match one character per question mark', () => {
      assert(!isMatch('a/bb/c/dd/e.md', 'a/?/c/?/e.md'));
      assert(isMatch('a/bb/c/dd/e.md', 'a/??/c/??/e.md'));
      assert(!isMatch('a/bbb/c.md', 'a/??/c.md'));
      assert(isMatch('a/b/c.md', 'a/?/c.md'));
      assert(isMatch('a/b/c/d/e.md', 'a/?/c/?/e.md'));
      assert(!isMatch('a/b/c/d/e.md', 'a/?/c/???/e.md'));
      assert(isMatch('a/b/c/zzz/e.md', 'a/?/c/???/e.md'));
      assert(!isMatch('a/bb/c.md', 'a/?/c.md'));
      assert(isMatch('a/bb/c.md', 'a/??/c.md'));
      assert(isMatch('a/bbb/c.md', 'a/???/c.md'));
      assert(isMatch('a/bbbb/c.md', 'a/????/c.md'));

      assert(!isMatch('aaa', 'a?c'));
      assert(isMatch('aac', 'a?c'));
      assert(isMatch('abc', 'a?c'));
      assert(!isMatch('a', 'ab?'));
      assert(!isMatch('aa', 'ab?'));
      assert(!isMatch('ab', 'ab?'));
      assert(!isMatch('ac', 'ab?'));
      assert(!isMatch('abcd', 'ab?'));
      assert(!isMatch('abbb', 'ab?'));
      assert(isMatch('acb', 'a?b'));
    });

    it('should enforce one character per qmark even when preceded by stars', () => {
      assert(!isMatch('a', '*??'));
      assert(!isMatch('aa', '*???'));
      assert(isMatch('aaa', '*???'));
      assert(!isMatch('a', '*****??'));
      assert(!isMatch('aa', '*****???'));
      assert(isMatch('aaa', '*****???'));
    });

    it('should support qmarks and stars', () => {
      assert(!isMatch('aaa', 'a*?c'));
      assert(isMatch('aac', 'a*?c'));
      assert(isMatch('abc', 'a*?c'));

      assert(isMatch('abc', 'a**?c'));
      assert(!isMatch('abb', 'a**?c'));
      assert(isMatch('acc', 'a**?c'));
      assert(isMatch('abc', 'a*****?c'));

      assert(isMatch('a', '*****?'));
      assert(isMatch('aa', '*****?'));
      assert(isMatch('abc', '*****?'));
      assert(isMatch('zzz', '*****?'));
      assert(isMatch('bbb', '*****?'));
      assert(isMatch('aaaa', '*****?'));

      assert(!isMatch('a', '*****??'));
      assert(isMatch('aa', '*****??'));
      assert(isMatch('abc', '*****??'));
      assert(isMatch('zzz', '*****??'));
      assert(isMatch('bbb', '*****??'));
      assert(isMatch('aaaa', '*****??'));

      assert(!isMatch('a', '?*****??'));
      assert(!isMatch('aa', '?*****??'));
      assert(isMatch('abc', '?*****??'));
      assert(isMatch('zzz', '?*****??'));
      assert(isMatch('bbb', '?*****??'));
      assert(isMatch('aaaa', '?*****??'));

      assert(isMatch('abc', '?*****?c'));
      assert(!isMatch('abb', '?*****?c'));
      assert(!isMatch('zzz', '?*****?c'));

      assert(isMatch('abc', '?***?****c'));
      assert(!isMatch('bbb', '?***?****c'));
      assert(!isMatch('zzz', '?***?****c'));

      assert(isMatch('abc', '?***?****?'));
      assert(isMatch('bbb', '?***?****?'));
      assert(isMatch('zzz', '?***?****?'));

      assert(isMatch('abc', '?***?****'));
      assert(isMatch('abc', '*******c'));
      assert(isMatch('abc', '*******?'));
      assert(isMatch('abcdecdhjk', 'a*cd**?**??k'));
      assert(isMatch('abcdecdhjk', 'a**?**cd**?**??k'));
      assert(isMatch('abcdecdhjk', 'a**?**cd**?**??k***'));
      assert(isMatch('abcdecdhjk', 'a**?**cd**?**??***k'));
      assert(isMatch('abcdecdhjk', 'a**?**cd**?**??***k**'));
      assert(isMatch('abcdecdhjk', 'a****c**?**??*****'));
    });

    it('should support qmarks, stars and slashes', () => {
      assert(!isMatch('a/b/c/d/e.md', 'a/?/c/?/*/e.md'));
      assert(isMatch('a/b/c/d/e/e.md', 'a/?/c/?/*/e.md'));
      assert(isMatch('a/b/c/d/efghijk/e.md', 'a/?/c/?/*/e.md'));
      assert(isMatch('a/b/c/d/efghijk/e.md', 'a/?/**/e.md'));
      assert(!isMatch('a/bb/e.md', 'a/?/e.md'));
      assert(isMatch('a/bb/e.md', 'a/??/e.md'));
      assert(!isMatch('a/bb/e.md', 'a/?/**/e.md'));
      assert(isMatch('a/b/ccc/e.md', 'a/?/**/e.md'));
      assert(isMatch('a/b/c/d/efghijk/e.md', 'a/*/?/**/e.md'));
      assert(isMatch('a/b/c/d/efgh.ijk/e.md', 'a/*/?/**/e.md'));
      assert(isMatch('a/b.bb/c/d/efgh.ijk/e.md', 'a/*/?/**/e.md'));
      assert(isMatch('a/bbb/c/d/efgh.ijk/e.md', 'a/*/?/**/e.md'));
    });

    it('should match non-leading dots', () => {
      assert(isMatch('aaa.bbb', 'aaa?bbb'));
    });

    it('should not match leading dots', () => {
      assert(!isMatch('.aaa/bbb', '?aaa/bbb'));
      assert(!isMatch('aaa/.bbb', 'aaa/?bbb'));
    });

    it('should match characters preceding a dot', () => {
      assert(isMatch('a/bbb/abcd.md', 'a/*/ab??.md'));
      assert(isMatch('a/bbb/abcd.md', 'a/bbb/ab??.md'));
      assert(isMatch('a/bbb/abcd.md', 'a/bbb/ab???md'));
    });
  });

  describe('parentheses ()', () => {
    it('should match literal parentheses in the input string', () => {
      assert(!isMatch('my/folder (Work, Accts)', '/*'));
      assert(isMatch('my/folder (Work, Accts)', '*/*'));
      assert(isMatch('my/folder (Work, Accts)', '*/*,*'));
      assert(isMatch('my/folder (Work, Accts)', '*/*(W*, *)*'));
      assert(isMatch('my/folder/(Work, Accts)', '**/*(W*, *)*'));
      assert(!isMatch('my/folder/(Work, Accts)', '*/*(W*, *)*'));
      assert(isMatch('foo(bar)baz', 'foo*baz'));
      assert(isMatch('foo(bar)baz', 'foo[bar()]+baz'));
    });

    it('should throw an error on imbalanced, unescaped parens', () => {
      let opts = { strictBrackets: true };
      assert.throws(() => picomatch.makeRe('*)', opts), /Missing opening: "\("/);
      assert.throws(() => picomatch.makeRe('*(', opts), /Missing closing: "\)"/);
    });

    it('should support regex logical "or"', () => {
      assert(isMatch('a/a', ['a/(a|c)']));
      assert(!isMatch('a/b', ['a/(a|c)']));
      assert(isMatch('a/c', ['a/(a|c)']));

      assert(isMatch('a/a', ['a/(a|b|c)', 'a/b']));
      assert(isMatch('a/b', ['a/(a|b|c)', 'a/b']));
      assert(isMatch('a/c', ['a/(a|b|c)', 'a/b']));
    });

    it('should support regex character classes inside extglobs', () => {
      assert(!isMatch('foo/bar', '**/!([a-k])*'));
      assert(!isMatch('foo/jar', '**/!([a-k])*'));

      assert(!isMatch('foo/bar', '**/!([a-i])*'));
      assert(isMatch('foo/bar', '**/!([c-i])*'));
      assert(isMatch('foo/jar', '**/!([a-i])*'));
    });
  });

  describe('path characters', () => {
    it('should match windows drives with globstars', () => {
      assert(isMatch('bar/', '**'));
      assert(isMatch('A://', '**'));
      assert(isMatch('B:foo/a/b/c/d', '**'));
      assert(isMatch('C:/Users/', '**'));
      assert(isMatch('c:\\', '**'));
      assert(isMatch('C:\\Users\\', '**'));
      assert(isMatch('C:cwd/another', '**'));
      assert(isMatch('C:cwd\\another', '**'));
    });

    // it('should not match multiple windows directories with a single star', () => {
    //   path.sep = '\\';
    //   assert(isMatch('c:\\', '*', { nocache: true }));
    //   assert(!isMatch('C:\\Users\\', '*', { nocache: true }));
    //   assert(!isMatch('C:cwd\\another', '*', { nocache: true }));
    //   path.sep = '/';
    // });

    it('should match mixed slashes when options.unixify is true', () => {
      assert(isMatch('//C://user\\docs\\Letter.txt', '**', { nocache: true, unixify: true }));
      assert(isMatch('//C:\\\\user/docs/Letter.txt', '**', { nocache: true, unixify: true }));
      assert(isMatch(':\\', '*', { nocache: true, unixify: true }));
      assert(isMatch(':\\', ':*', { nocache: true, unixify: true }));
      assert(isMatch('\\\\foo/bar', '**', { nocache: true, unixify: true }));
      assert(isMatch('\\\\foo/bar', '/*/*', { nocache: true, unixify: true }));
      assert(isMatch('\\\\unc\\admin$', '**', { nocache: true, unixify: true }));
      assert(isMatch('\\\\unc\\admin$', '/*/*$', { nocache: true, unixify: true }));
      assert(isMatch('\\\\unc\\admin$\\system32', '/*/*$/*32', { nocache: true, unixify: true }));
      assert(isMatch('\\\\unc\\share\\foo', '/u*/s*/f*', { nocache: true, unixify: true }));
      assert(isMatch('foo\\bar\\baz', 'f*/*/*', { nocache: true, unixify: true }));
      assert(isMatch('//*:/**', '**'));
      assert(!isMatch('//server/file', '//*'));
      assert(isMatch('//server/file', '/**'));
      assert(isMatch('//server/file', '//**'));
      assert(isMatch('//server/file', '**'));
      assert(isMatch('//UNC//Server01//user//docs//Letter.txt', '**'));
      assert(isMatch('/foo', '**'));
      assert(isMatch('/foo/a/b/c/d', '**'));
      assert(isMatch('/foo/bar', '**'));
      assert(isMatch('/home/foo', '**'));
      assert(isMatch('/home/foo/..', '**/..'));
      assert(isMatch('/user/docs/Letter.txt', '**'));
      assert(isMatch('directory\\directory', '**'));
      assert(isMatch('a/b/c.js', '**'));
      assert(isMatch('directory/directory', '**'));
      assert(isMatch('foo/bar', '**'));
    });

    it('should match any character zero or more times, except for /', () => {
      assert(!isMatch('foo', '*a*'));
      assert(!isMatch('foo', '*r'));
      assert(!isMatch('foo', 'b*'));
      assert(!isMatch('foo/bar', '*'));
      assert(isMatch('foo/bar', '*/*'));
      assert(!isMatch('foo/bar/baz', '*/*'));
      assert(isMatch('bar', '*a*'));
      assert(isMatch('bar', '*r'));
      assert(isMatch('bar', 'b*'));
      assert(isMatch('foo/bar/baz', '*/*/*'));
    });

    it('should match dashes surrounded by spaces', () => {
      assert(isMatch('my/folder - 1', '*/*'));
      assert(isMatch('my/folder - copy (1)', '*/*'));
      assert(isMatch('my/folder - copy [1]', '*/*'));
      assert(isMatch('my/folder - foo + bar - copy [1]', '*/*'));
      assert(!isMatch('my/folder - foo + bar - copy [1]', '*'));

      assert(isMatch('my/folder - 1', '*/*-*'));
      assert(isMatch('my/folder - copy (1)', '*/*-*'));
      assert(isMatch('my/folder - copy [1]', '*/*-*'));
      assert(isMatch('my/folder - foo + bar - copy [1]', '*/*-*'));

      assert(isMatch('my/folder - 1', '*/*1'));
      assert(!isMatch('my/folder - copy (1)', '*/*1'));
    });

    it('should match dollar signs', () => {
      assert(!isMatch('$', '!($)'));
      assert(!isMatch('$', '!$'));
      assert(isMatch('$$', '!$'));
      assert(isMatch('$$', '!($)'));
      assert(isMatch('$$$', '!($)'));
      assert(isMatch('^', '!($)'));

      assert(isMatch('$', '!($$)'));
      assert(!isMatch('$$', '!($$)'));
      assert(isMatch('$$$', '!($$)'));
      assert(isMatch('^', '!($$)'));

      assert(!isMatch('$', '!($*)'));
      assert(!isMatch('$$', '!($*)'));
      assert(!isMatch('$$$', '!($*)'));
      assert(isMatch('^', '!($*)'));

      assert(isMatch('$', '*'));
      assert(isMatch('$$', '*'));
      assert(isMatch('$$$', '*'));
      assert(isMatch('^', '*'));

      assert(isMatch('$', '$*'));
      assert(isMatch('$$', '$*'));
      assert(isMatch('$$$', '$*'));
      assert(!isMatch('^', '$*'));

      assert(isMatch('$', '*$*'));
      assert(isMatch('$$', '*$*'));
      assert(isMatch('$$$', '*$*'));
      assert(!isMatch('^', '*$*'));

      assert(isMatch('$', '*$'));
      assert(isMatch('$$', '*$'));
      assert(isMatch('$$$', '*$'));
      assert(!isMatch('^', '*$'));

      assert(!isMatch('$', '?$'));
      assert(isMatch('$$', '?$'));
      assert(!isMatch('$$$', '?$'));
      assert(!isMatch('^', '?$'));
    });
  });

  describe('^ caret', function() {
    it('should match carets', () => {
      assert(isMatch('^', '^'));
      assert(isMatch('^/foo', '^/*'));
      assert(isMatch('^/foo', '^/*'));
      assert(isMatch('foo^', '*^'));
      assert(isMatch('^foo/foo', '^foo/*'));
      assert(isMatch('foo^/foo', 'foo^/*'));

      assert(!isMatch('^', '!(^)'));
      assert(isMatch('^^', '!(^)'));
      assert(isMatch('^^^', '!(^)'));
      assert(isMatch('&', '!(^)'));

      assert(isMatch('^', '!(^^)'));
      assert(!isMatch('^^', '!(^^)'));
      assert(isMatch('^^^', '!(^^)'));
      assert(isMatch('&', '!(^^)'));

      assert(!isMatch('^', '!(^*)'));
      assert(!isMatch('^^', '!(^*)'));
      assert(!isMatch('^^^', '!(^*)'));
      assert(isMatch('&', '!(^*)'));

      assert(isMatch('^', '*'));
      assert(isMatch('^^', '*'));
      assert(isMatch('^^^', '*'));
      assert(isMatch('&', '*'));

      assert(isMatch('^', '^*'));
      assert(isMatch('^^', '^*'));
      assert(isMatch('^^^', '^*'));
      assert(!isMatch('&', '^*'));

      assert(isMatch('^', '*^*'));
      assert(isMatch('^^', '*^*'));
      assert(isMatch('^^^', '*^*'));
      assert(!isMatch('&', '*^*'));

      assert(isMatch('^', '*^'));
      assert(isMatch('^^', '*^'));
      assert(isMatch('^^^', '*^'));
      assert(!isMatch('&', '*^'));

      assert(!isMatch('^', '?^'));
      assert(isMatch('^^', '?^'));
      assert(!isMatch('^^^', '?^'));
      assert(!isMatch('&', '?^'));
    });

    it('should...', () => {
      assert(isMatch('my/folder +1', '*/*'));
      assert(isMatch('my/folder -1', '*/*'));
      assert(isMatch('my/folder *1', '*/*'));
      assert(isMatch('my/folder', '*/*'));
      assert(isMatch('my/folder+foo+bar&baz', '*/*'));
      assert(isMatch('my/folder - $1.00', '*/*'));
      assert(isMatch('my/folder - ^1.00', '*/*'));
      assert(isMatch('my/folder - %1.00', '*/*'));

      assert(isMatch('my/folder +1', '*/!(*%)*'));
      assert(isMatch('my/folder -1', '*/!(*%)*'));
      assert(isMatch('my/folder *1', '*/!(*%)*'));
      assert(isMatch('my/folder', '*/!(*%)*'));
      assert(isMatch('my/folder+foo+bar&baz', '*/!(*%)*'));
      assert(isMatch('my/folder - $1.00', '*/!(*%)*'));
      assert(isMatch('my/folder - ^1.00', '*/!(*%)*'));
      assert(!isMatch('my/folder - %1.00', '*/!(*%)*'));

      assert(!isMatch('my/folder +1', '*/*$*'));
      assert(!isMatch('my/folder -1', '*/*$*'));
      assert(!isMatch('my/folder *1', '*/*$*'));
      assert(!isMatch('my/folder', '*/*$*'));
      assert(!isMatch('my/folder+foo+bar&baz', '*/*$*'));
      assert(isMatch('my/folder - $1.00', '*/*$*'));
      assert(!isMatch('my/folder - ^1.00', '*/*$*'));
      assert(!isMatch('my/folder - %1.00', '*/*$*'));

      assert(!isMatch('my/folder +1', '*/*^*'));
      assert(!isMatch('my/folder -1', '*/*^*'));
      assert(!isMatch('my/folder *1', '*/*^*'));
      assert(!isMatch('my/folder', '*/*^*'));
      assert(!isMatch('my/folder+foo+bar&baz', '*/*^*'));
      assert(!isMatch('my/folder - $1.00', '*/*^*'));
      assert(isMatch('my/folder - ^1.00', '*/*^*'));
      assert(!isMatch('my/folder - %1.00', '*/*^*'));

      assert(!isMatch('my/folder +1', '*/*&*'));
      assert(!isMatch('my/folder -1', '*/*&*'));
      assert(!isMatch('my/folder *1', '*/*&*'));
      assert(!isMatch('my/folder', '*/*&*'));
      assert(isMatch('my/folder+foo+bar&baz', '*/*&*'));
      assert(!isMatch('my/folder - $1.00', '*/*&*'));
      assert(!isMatch('my/folder - ^1.00', '*/*&*'));
      assert(!isMatch('my/folder - %1.00', '*/*&*'));

      assert(isMatch('my/folder +1', '*/*+*'));
      assert(!isMatch('my/folder -1', '*/*+*'));
      assert(!isMatch('my/folder *1', '*/*+*'));
      assert(!isMatch('my/folder', '*/*+*'));
      assert(isMatch('my/folder+foo+bar&baz', '*/*+*'));
      assert(!isMatch('my/folder - $1.00', '*/*+*'));
      assert(!isMatch('my/folder - ^1.00', '*/*+*'));
      assert(!isMatch('my/folder - %1.00', '*/*+*'));

      assert(!isMatch('my/folder +1', '*/*-*'));
      assert(isMatch('my/folder -1', '*/*-*'));
      assert(!isMatch('my/folder *1', '*/*-*'));
      assert(!isMatch('my/folder', '*/*-*'));
      assert(!isMatch('my/folder+foo+bar&baz', '*/*-*'));
      assert(isMatch('my/folder - $1.00', '*/*-*'));
      assert(isMatch('my/folder - ^1.00', '*/*-*'));
      assert(isMatch('my/folder - %1.00', '*/*-*'));

      assert(!isMatch('my/folder +1', '*/*\\**'));
      assert(!isMatch('my/folder -1', '*/*\\**'));
      assert(isMatch('my/folder *1', '*/*\\**'));
      assert(!isMatch('my/folder', '*/*\\**'));
      assert(!isMatch('my/folder+foo+bar&baz', '*/*\\**'));
      assert(!isMatch('my/folder - $1.00', '*/*\\**'));
      assert(!isMatch('my/folder - ^1.00', '*/*\\**'));
      assert(!isMatch('my/folder - %1.00', '*/*\\**'));
    });

    it('should support square brackets in globs', () => {
      assert(isMatch('foo/bar - 1', '**/*[1]'));
      assert(!isMatch('foo/bar - copy (1)', '**/*[1]'));
      assert(!isMatch('foo/bar (1)', '**/*[1]'));
      assert(!isMatch('foo/bar (4)', '**/*[1]'));
      assert(!isMatch('foo/bar (7)', '**/*[1]'));
      assert(!isMatch('foo/bar (42)', '**/*[1]'));
      assert(isMatch('foo/bar - copy [1]', '**/*[1]'));
      assert(isMatch('foo/bar - foo + bar - copy [1]', '**/*[1]'));
    });

    it('should match literal brackets', () => {
      assert(isMatch('a [b]', 'a \\[b\\]'));
      assert(isMatch('a [b] c', 'a [b] c'));
      assert(isMatch('a [b]', 'a \\[b\\]*'));
      assert(isMatch('a [bc]', 'a \\[bc\\]*'));
      assert(!isMatch('a [b]', 'a \\[b\\].*'));
      assert(isMatch('a [b].js', 'a \\[b\\].*'));
      assert(!isMatch('foo/bar - 1', '**/*\\[*\\]'));
      assert(!isMatch('foo/bar - copy (1)', '**/*\\[*\\]'));
      assert(!isMatch('foo/bar (1)', '**/*\\[*\\]'));
      assert(!isMatch('foo/bar (4)', '**/*\\[*\\]'));
      assert(!isMatch('foo/bar (7)', '**/*\\[*\\]'));
      assert(!isMatch('foo/bar (42)', '**/*\\[*\\]'));
      assert(isMatch('foo/bar - copy [1]', '**/*\\[*\\]'));
      assert(isMatch('foo/bar - foo + bar - copy [1]', '**/*\\[*\\]'));

      assert(!isMatch('foo/bar - 1', '**/*\\[1\\]'));
      assert(!isMatch('foo/bar - copy (1)', '**/*\\[1\\]'));
      assert(!isMatch('foo/bar (1)', '**/*\\[1\\]'));
      assert(!isMatch('foo/bar (4)', '**/*\\[1\\]'));
      assert(!isMatch('foo/bar (7)', '**/*\\[1\\]'));
      assert(!isMatch('foo/bar (42)', '**/*\\[1\\]'));
      assert(isMatch('foo/bar - copy [1]', '**/*\\[1\\]'));
      assert(isMatch('foo/bar - foo + bar - copy [1]', '**/*\\[1\\]'));

      assert(!isMatch('foo/bar - 1', '*/*\\[*\\]'));
      assert(!isMatch('foo/bar - copy (1)', '*/*\\[*\\]'));
      assert(!isMatch('foo/bar (1)', '*/*\\[*\\]'));
      assert(!isMatch('foo/bar (4)', '*/*\\[*\\]'));
      assert(!isMatch('foo/bar (7)', '*/*\\[*\\]'));
      assert(!isMatch('foo/bar (42)', '*/*\\[*\\]'));
      assert(isMatch('foo/bar - copy [1]', '*/*\\[*\\]'));
      assert(isMatch('foo/bar - foo + bar - copy [1]', '*/*\\[*\\]'));

      assert(isMatch('a [b]', 'a \\[b\\]'));
      assert(isMatch('a [b] c', 'a [b] c'));
      assert(isMatch('a [b]', 'a \\[b\\]*'));
      assert(isMatch('a [bc]', 'a \\[bc\\]*'));
      assert(!isMatch('a [b]', 'a \\[b\\].*'));
      assert(isMatch('a [b].js', 'a \\[b\\].*'));
    });
  });

  describe('braces', () => {
    it('should support braces nested in parentheses', () => {
      const expandRange = (a, b) => `(${fill(a, b, { toRegex: true })})`;

      assert(!isMatch('foo/bar - 1', '*/* \\({4..10}\\)', { expandRange }));
      assert(!isMatch('foo/bar - copy (1)', '*/* \\({4..10}\\)', { expandRange }));
      assert(!isMatch('foo/bar (1)', '*/* \\({4..10}\\)', { expandRange }));
      assert(isMatch('foo/bar (4)', '*/* \\({4..10}\\)', { expandRange }));
      assert(isMatch('foo/bar (7)', '*/* \\({4..10}\\)', { expandRange }));
      assert(!isMatch('foo/bar (42)', '*/* \\({4..10}\\)', { expandRange }));
      assert(!isMatch('foo/bar - copy [1]', '*/* \\({4..10}\\)', { expandRange }));
      assert(!isMatch('foo/bar - foo + bar - copy [1]', '*/* \\({4..10}\\)', { expandRange }));
    });
  });

  describe('star - "*"', () => {
    it('should match literal *', () => {
      assert(isMatch('*', '*'));
      assert(isMatch('*/*', '*/*'));
      assert(isMatch('*/*', '?/?'));
      assert(isMatch('*/*/', '*/*/'));
      assert(isMatch('/*', '/*'));
      assert(isMatch('/*', '/?'));
      assert(isMatch('foo*/bar*', '*/*'));
    });

    it('should support stars following brackets', () => {
      assert(isMatch('a', '[a]*'));
      assert(isMatch('aa', '[a]*'));
      assert(isMatch('aaa', '[a]*'));
      assert(isMatch('az', '[a-z]*'));
      assert(isMatch('zzz', '[a-z]*'));
    });

    it('should support stars following parens', () => {
      assert(isMatch('a', '(a)*'));
      assert(isMatch('ab', '(a|b)*'));
      assert(isMatch('aa', '(a)*'));
      assert(isMatch('aaab', '(a|b)*'));
      assert(isMatch('aaabbb', '(a|b)*'));
    });

    it('should not match slashes with single stars', () => {
      assert(!isMatch('a/b', '(a)*'));
      assert(!isMatch('a/b', '[a]*'));
      assert(!isMatch('a/b', 'a*'));
      assert(!isMatch('a/b', '(a|b)*'));
    });

    it('should not match dots with stars by default', () => {
      assert(!isMatch('.a', '(a)*'));
      assert(!isMatch('.a', '*[a]*'));
      assert(!isMatch('.a', '*[a]'));
      assert(!isMatch('.a', '*a*'));
      assert(!isMatch('.a', '*a'));
      assert(!isMatch('.a', '*(a|b)'));
    });
  });

  describe('plus - "+"', () => {
    it('should match literal +', () => {
      assert(isMatch('+', '*'));
      assert(isMatch('/+', '/*'));
      assert(isMatch('+/+', '*/*'));
      assert(isMatch('+/+/', '*/*/'));
      assert(isMatch('/+', '/+'));
      assert(isMatch('/+', '/?'));
      assert(isMatch('+/+', '?/?'));
      assert(isMatch('+/+', '+/+'));
      assert(isMatch('foo+/bar+', '*/*'));
    });

    it('should support plus signs that follow brackets (and not escape them)', () => {
      assert(isMatch('a', '[a]+'));
      assert(isMatch('aa', '[a]+'));
      assert(isMatch('aaa', '[a]+'));
      assert(isMatch('az', '[a-z]+'));
      assert(isMatch('zzz', '[a-z]+'));
    });

    it('should not escape plus signs that follow parens', () => {
      assert(isMatch('a', '(a)+'));
      assert(isMatch('ab', '(a|b)+'));
      assert(isMatch('aa', '(a)+'));
      assert(isMatch('aaab', '(a|b)+'));
      assert(isMatch('aaabbb', '(a|b)+'));
    });

    it('should escape plus signs to match string literals', () => {
      assert(isMatch('a+b/src/glimini.js', 'a+b/src/*.js'));
      assert(isMatch('+b/src/glimini.js', '+b/src/*.js'));
      assert(isMatch('coffee+/src/glimini.js', 'coffee+/src/*.js'));
      assert(isMatch('coffee+/src/glimini.js', 'coffee+/src/*.js'));
      assert(isMatch('coffee+/src/glimini.js', 'coffee+/src/*'));
    });

    it('should not escape + following brackets', () => {
      assert(isMatch('a', '[a]+'));
      assert(isMatch('aa', '[a]+'));
      assert(isMatch('aaa', '[a]+'));
      assert(isMatch('az', '[a-z]+'));
      assert(isMatch('zzz', '[a-z]+'));
    });

    it('should not escape + following parens', () => {
      assert(isMatch('a', '(a)+'));
      assert(isMatch('ab', '(a|b)+'));
      assert(isMatch('aa', '(a)+'));
      assert(isMatch('aaab', '(a|b)+'));
      assert(isMatch('aaabbb', '(a|b)+'));
    });
  });
});
