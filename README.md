[![Build Status](https://travis-ci.org/simpleviewinc/goatee.svg?branch=master)](https://travis-ci.org/simpleviewinc/goatee)

# goatee

`npm install goatee`

Powerful yet simple templating system with Mustache style syntax and many more features. Works in node and browser with requirejs.

# Features

0. Works client-side and within Node.
0. Super simple syntax.
0. Fills templates based on strings, does not require any specific folder structure.
0. Similar syntax to Mustache and Handlebars.

# Getting started

`npm install goatee`

```js
// node
var goatee = require("goatee");
console.log(goatee.fill("{{foo}}", { foo : "success" }));
// success
```

```js
// requirejs
require(["goatee"], function(goatee) {
    console.log(goatee.fill("{{foo}}", { foo : "success" }));
    // success
});
```

```html
<!-- html -->
<script src="goatee/index.js"></script>
<script>
    console.log(goatee.fill("{{foo}}", { foo : "success" }));
    // success
</script>
```

# API Documentation

### goatee.fill(templateString, data, partials, globalData)

Fills a template with data.

Returns `string`.

* `templateString` - `string` - `required` - Template string to be filled with data.
* `data` - `object` - `default {}` - Data which will fill the template.
* `partials` - `object` - `default {}` - Object with keys containing partials, sub-templates to be used within the template. See partials for more information.
* `globalData` - `object` - `defaults to value passed to data` - Object with global data which can be accessed anywhere within the template.

### goatee.Goatee

Coming later

## Tags

### Tag Quick Reference

0. `{{key}}` - Output variable
1.  `{{:key}}` - Positive conditional.
2.  `{{!key}}` - Negative conditional.
3. `{{>key}}`- Partial.
4. `{{+key}}` - Custom partial.
5. `{{*key}}` - Global data.
6.  `{{#key}}` - Section, object or array.
7.  `{{%key}}` - HTML encode (`><&"`)
8.  `{{@key}}` - Extra data during array iteration.
9.  `{{~key}}` - Helpers.
10.  `{{$}}` - Preserve.

### Understanding tags

All tags follows the pattern `{{[operator][lookup][locatorChain]}}`.

`operators` are `: ! + > $ %`. They instruct the system to DO something with the data, such as reaching inside, checking if it's true. When no operator is present the content at the locator will be output. Tags can never have more than one operator!

`lookup` are `* @ ~`. They instruct the system where to look for the data.

`locatorChain` is a dot seperated path to access the variable. Locators match pretty much 1 to 1 to native javascript. In example in goatee a locator of `foo().bar.baz()` works nearly the same as it would if it was done in JS. The only caveat is that if any step of chain returns `undefined` the system will not throw an error, instead the tag will return falsy.

 Tag types which have a closing and opening tag such as positive conditional, negative conditional, and custom partial do not require that the closing tag matches the name.
    3. `{{#key}} {{/key}}` is the preferred method because it matches HTML syntax.
    4. `{{#key}} {{/}}` also works and is used often when the opening tag is very long, such as when using a helper expression.

Valid Tag Examples

0. `{{foo}}` - Output a simple variable
0.  `{{%foo}}` - Output a variable and encode.
0. `{{#foo().baz}} {{/}}` - Iterate over the value at `foo().baz` in normal data.
0.  `{{#*data.bar()}} {{/}}` - Iterate over the value at `globalData.bar`.
0. `{{foo(data.bar).baz}}` - Output a variable which is contained by calling the function passed at `foo` with an argument which is the value passed at `bar` and then get `baz` out of that result.

### JS Expressions

You can execute arbitrary javascript within certain tags. In doing so it will `eval` the contents but many global variables are not accessible such as `require` `window` `setTimeout` etc.

**NOTE:** While in JS expressions all of your data is namespaced. In expressions goatee `lookups` are replaced with variable names.

0. `data.` - Accesses the data at the current context.
1. `global.` - Access the data in the globalData context (`*`).
2.  `helpers.` - Access the helpers (`~`).
3.  `extra.` - Access the extraData (`@`).

**NOTE:** JS expressions can not return async.

Example, output a formatted `moment` object.
```html
{{moment(data.myData).format("LLLL")}}
```
JS
```js
var result = goatee.fill(template, { moment : moment, myData : new Date(2011, 1, 1) });
```
Result. Notice how we pass in the moment object and the date. The key myData is accessed using `data.myData` within the JS expression. **All or your data is namespaced within JS expressions!**
```html
Tuesday, February 1, 2011 12:00 AM
```

## Tag Reference

### Output variable `{{var}}`

If the variable exists and is a simple value (string, integer, boolean) it will output it's `toString()` equivalent.

To html encode a variable (escaping "<>&) pass `{{%var}}`

```js
var result = goatee.fill("{{foo}}", { foo : "test" });
result === "test";

var result = goatee.fill("{{%foo}}", { foo : "<div>Test</div>" });
result === "&lt;div&gt;Test&lt;/div&gt;";
```

### Positive conditional `{{:var}} content {{/var}}` (if true)

If the value of `var` evaluates to true, see conditions below, the it will run the contents within the conditional. If the value of `var` fails to evaluate to true then the contents of the tag will return "" in their entirety.

The following cases will run the contents of the tag.

0. Arrays with length > 0
0. Objects that have keys.
0. Strings which are not "".
0. Any number.

Template
```html
{{:image}}
    <img src="{{image}}"/>
{{/image}}
```
JS
```js
var result = goatee.fill(template, { image : "http://www.test.com/image.png" });
result === '<img src="http://www.test.com/image.png"/>';

var result = goatee.fill(template, {});
result === "";
```

### Negative conditional `{{!var}} content {{/var}}` (if false)

If the value of `var` evaluates to false, see conditions below, the it will run the contents within the conditional. If the value of `var` fails to evaluate to false then the contents of the tag will return "" in their entirety.

The following cases will run the contents of the tag.

0. Arrays with length === 0
0. Objects that have 0 keys.
0. Strings which are "".
0. `undefined`
0. `false`

### Sections `{{#var}} content {{/var}}`

Sections are used for processing arrays and objects, changing the current context to new context.

### Objects

0. If the value is an object, then the context will become what is at the value of var.

Template
```html
{{#myObj}}
    <div class="{{class}}">{{title}}</div>
{{/myObj}}
```

JS
```js
var result = goatee.fill(template, { myObj : { class : "blueTheme", title : "Goatee" } });
```
Result
```html
<div classs="blueTheme">Goatee</div>
```

#### Arrays

0. If the value of tag variable is an array then contentx of the tag is run for each item in the array. In addition, the current context will refer to the current item.
0. The following special keys are avaiable inside arrays. All row values are 1 based.
    0. `@odd` - True if the current row being processed is odd (1st, 3rd, 5th row).
    1. `@even` - True if the current row being processed is even (2nd, 4th, 6th).
    2. `@row` - The row of the current row being processed.
    3. `@first` - If the row is the first in the array.
    4. `@last` - If the row is the last in the array.
    5. `@data` - References the current context data. Useful when iterating over arrays of strings or numbers.

Template
```html
{{#myArr}}
    <span class="{{:@even}}even{{/even}}">{{key}}</span>
{{/myArr}}
```
JS
```js
var data = {
    myArr : [
        { key : "bar" },
        { key : "baz" },
        { key : "qux" }
    ]
};

var result = goatee.fill(template, data);
```
Result
```html
//result
<span class="">bar</span>
<span class="even">baz</span>
<span class="">qux</span>
```
Using data attributes to create a comma separated list.
```js
var result = goatee.fill("{{#myArr}}{{@data}}{{!@last}},{{/last}}{{/myArr}}", { myArr : [1,2,3] });
result === "1,2,3"
```

### Partials `{{>var}}`

Partials are a way of including micro-templates at run time.

When a partial is run it is always run at the current context. This means if you include a partial while iterating within an array, then the partial will be filled with the data from the content at that array element.

JS
```js
var mainTemplate = "<div class='items'>{{#item}}{{>itemTemplate}}{{/item}}</div>";
var itemTemplate = "<div class='item'>{{title}}</div>";
var data = {
    items : [
        { title : "Foo" },
        { title : "Bar" },
        { title : "Baz" }
    ]
}
var result = goatee.fill(mainTemplate, data, { itemTemplate : itemTemplate });
```
Result
```html
<div class="items">
    <div class="item">Foo</div>
    <div class="item">Bar</div>
    <div class="item">Baz</div>
</div>
```

### Custom Partials `{{+var}} content {{/var}}`

There are times when you want to declare a partial within your template.

Common use-cases

0. Re-using a part of your template multiple times, such as paging buttons above and below a result set.
0. Recursive elements within your template. This is used a lot when representing parent-child situations such as nested multi-level navigation.

Re-using a custom partial
```html
{{+pager}}
    <div class="pager">{{row}} of {{rows}}</div>
{{/pager}}

<div class='resultSet'>
    {{>pager}}
    <div class="items"><!-- item content --></div>
    {{>pager}}
</div>
``` 
```js
var result = goatee.fill(template, { row : 1, rows : 10, items : [] });
```
Result. Notice how we are able to re-use the pager template.
```html
<div class='resultSet'>
    <div class="pager">1 of 10</div>
    <div class="items"><!-- items content --></div>
    <div class="pager">1 of 10</div>
</div>
```

Recursive template
```html
{{+item}}
    <div class="item">
        <div class="content">{{title}}</div>
        {{:children}}
            <div class="children">
                {{#children}}
                    {{>item}}
                {{/children}}
            </div>
        {{/children}}
    </div>
{{/item}}

<div class="items">
    {{>item}}
</div>
```
JS
```js
var data = {
    title : "Top Level",
    children : [
        { title : "Second Level No Children" },
        {
            title : "Second level Children",
            children : [
                { title : "Third Level" }   
            ]
        }
    ]
}

var result = goatee.fill(template, data);
```
Result. Notice how we are able to create a structure which can iterate over itself as deep as our data requires. 
```html
<div class="items">
    <div class="item">
        <div class="content">Top Level</div>
        <div class="children">
            <div class="item">
                <div class="content">Second Level No Children</div>
            </div>
            <div class="item">
                <div class="content">Second level Children</div>
                <div class="children">
                    <div class="item">
                        <div class="content">Third Level</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

### Global Data `{{*var}}`

Often while iterating through an array or object you'll want to reference keys that were in the top level context.

If not passed, globalData will default to the root scope of your data.

Global data is accessed with the same locators as normal data. The only difference is that you prefix the key with the `*` symbol.

Template
```html
{{#items}}
    <a href="{{url}}" target="{{*target}}">{{title}}</a>
{{/items}}
```
JS
```js
var data = {
    target : "_blank",
    items : [
        { url : "http://www.google.com", title : "Google" },
        { url : "http://www.bing.com", title : "Bing" }
    ]
}

// we do not pass globalData, therefore globalData === data;
var result = goatee.fill(template, data);
```
Result, notice how the target attribute is filled in even though each item only has a `url` and `title` key. This is possible because the target was pulled from the global scope with `{{*target}}`.
```html
<a href="http://www.google.com" target="_blank">Google</a>
<a href="http://www.bing.com" target="_blank">Bing</a>
```
JS
```js
// now lets do the same command except we'll pass our own globalData hash
var result = goatee.fill(template, data, {}, { target : "_top" });
```
Result
```html
<a href="http://www.google.com" target="_top">Google</a>
<a href="http://www.bing.com" target="_top">Bing</a>
```

### Preserving templates `{{$}}`

There are times when you have a goatee template embedded inside a goatee template and you do not want that template processed right away. A common use-case is when a template is processed server-side but contains a template which is going to be used client-side. If that client-side template isn't preserved, then the contents of that sub-template will end up executed.

```html
<h1>{{pageTitle}}</h1>
<div class="items"></div>
<script type="text/template" id="itemTemplate">
    {{$}}
        <div class="item" data-id="{{id}}">{{title}}</div>
    {{/}}
</script>
```
JS
```js
var result = goatee.fill(template, { pageTitle : "My Title" });
```
Result, notice how the template tags within the script tag remain. This is because the template was preserved using `{{$}}`. Had it not been preserved, it would have executed the `{{id}}` and `{{title}}` tag within it. Now that itemTemplate could be extracted on the client-side and filled using goatee in the browser.
```html
<h1>My Title</h1>
<div class="items"></div>
<script type="text/template" id="itemTemplate">
    <div class="item" data-id="{{id}}">{{title}}</div>
</script>
```

## Helpers

Helpers are a `lookup` area which provides access to some useful functions as well as being a place where you can add plugins allowing you to pass additional functionality into your template system.

### helpers.equal `{{:~equal(var1, var2)}} {{/}}`

Compares the two values and returns if they are equal. The value of `var1` and `var2` can be any JS expression.

Note: There is no requirement that you use a `:` or `!` with the `equal` helper, but it's quite common unless you actually want to output the word `true` or `false`.

```js

```



