// Copyright 2020 CUE Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as React from "react";
import * as acemodule from "ace-builds";
import { CUEVersion } from "./gen_cuelang_org_go_version";

const editorFontSize = 15;

interface AppProps {
	WasmAPI : WasmAPI;
}

interface AppState {
	readonly Input : InputOption;
	readonly Func : FuncOption;
	readonly Output : OutputOption;
	readonly Saved : boolean;
	readonly ShowSaveURL : boolean;
	readonly ShowZenMode : boolean;
	readonly ZenCurrentExercise: number;
}

const optionSeparator = "@";

abstract class Option {
	constructor(readonly name : string, readonly key : string) { }
	abstract Hash(state : AppState) : string;
}

function HashOptions(...opts : Option[]) : string {
	let vals : string[] = [];
	for (let o of opts) {
		vals.push(o.key);
	}
	return "#" + vals.join(optionSeparator);
}

class InputOption extends Option {
	Hash(state : AppState) : string {
		return HashOptions(this, state.Func, state.Output);
	}
}

class FuncOption extends Option {
	Hash(state : AppState) : string {
		return HashOptions(state.Input, this, state.Output);
	}
}

class OutputOption extends Option {
	Hash(state : AppState) : string {
		return HashOptions(state.Input, state.Func, this);
	}
}

let inputOptions : InputOption[] = [
	new InputOption("CUE", "cue"),
	// new InputOption("JSON", "json"),
	// new InputOption("Yaml", "yaml"),
];

let funcOptions : FuncOption[] = [
	new FuncOption("export", "export"),
	new FuncOption("def", "def"),
];

let outputOptions : OutputOption[] = [
	new OutputOption("CUE", "cue"),
	new OutputOption("JSON", "json"),
	new OutputOption("Yaml", "yaml"),
]

// App is the root of our React application
export class App extends React.PureComponent<AppProps, AppState> {
	private lhsEditor : acemodule.Ace.Editor;
	private rhsEditor : acemodule.Ace.Editor;

	constructor(props : AppProps) {
		super(props);
		this.state = {
			Input: undefined,
			Func: undefined,
			Output: undefined,
			Saved: false,
			ShowSaveURL: false,
			ShowZenMode: false,
			ZenCurrentExercise: 0,
		};
		this.state = this.urlHashToState();

		// TODO is this really required in 2020?
		this.urlHashChanged = this.urlHashChanged.bind(this);
		this.urlHashToState = this.urlHashToState.bind(this);
		this.inputDidChange = this.inputDidChange.bind(this);
		this.updateOutput = this.updateOutput.bind(this);
		this.share = this.share.bind(this);
		this.zen = this.zen.bind(this);
		this.zenNext = this.zenNext.bind(this);
		this.zenPrev = this.zenPrev.bind(this);

		props.WasmAPI.OnChange(this.updateOutput);
		window.addEventListener("hashchange", this.urlHashChanged);
	}

	render() {
		// Inputs can be whatever. Funcs are a function of input. Outputs are a function of funcs
		// This logic belongs elsewhere :)
		let inputs = inputOptions;
		let funcs = new Array<FuncOption>();
		funcs.push(funcOptions[0]);
		if (this.state.Input.key == "cue") {
			funcs.push(funcOptions[1]);
		}
		let outputs = outputOptions;
		let showOutputs = "inline-block";
		if (this.state.Func.key == "def") {
			showOutputs = "none";
		}

		return (
			<div className="grid-container">
				<div className="header">
					<div className="title">CUE Playground</div>
					<div className="controls">
						<div className="dropdown" style={{ display: "inline-block" }}>
							<button className="btn btn-secondary btn-sm dropdown-toggle" type="button" id="inputMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								Input: {this.state.Input.name}
							</button>
							<div className="dropdown-menu dropdown-menu-right" aria-labelledby="inputMenuButton">
								{[
									inputs.map((v) => <a key={v.key} className="dropdown-item" href={v.Hash(this.state)}>{v.name}</a>)
								]}
							</div>
						</div>
						<div className="dropdown" style={{ display: "inline-block" }}>
							<button className="btn btn-secondary btn-sm dropdown-toggle" type="button" id="funcMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								{this.state.Func.name}
							</button>
							<div className="dropdown-menu dropdown-menu-right" aria-labelledby="funcMenuButton">
								{[
									funcs.map((v) => <a key={v.key} className="dropdown-item" href={v.Hash(this.state)}>{v.name}</a>)
								]}
							</div>
						</div>
						<div className="dropdown" style={{ display: showOutputs }}>
							<button className="btn btn-secondary btn-sm dropdown-toggle" type="button" id="outputMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								Output: {this.state.Output.name}
							</button>
							<div className="dropdown-menu dropdown-menu-right" aria-labelledby="outputMenuButton">
								{[
									outputs.map((v) => <a key={v.key} className="dropdown-item" href={v.Hash(this.state)}>{v.name}</a>)
								]}
							</div>
						</div>
						<div>
							<button className="btn btn-secondary btn-sm" type="button" onClick={this.share} disabled={this.state.Saved}>
								Share
							</button>
						</div>
						<div>
							<input style={{ display: (this.state.ShowSaveURL ? "" : "none") }} readOnly={true} className="form-control form-control-sm" id="shareURL" value={window.location.toString()} />
						</div>
						<div>
							<button className="btn btn-secondary btn-sm" type="button" onClick={this.zen}>
								Zen
							</button>
						</div>
						<div>
						<button style={{ display: (this.state.ShowZenMode ? "" : "none") }} className="btn btn-secondary btn-sm" type="button" onClick={this.zenNext}>
								Next
							</button>
						</div>
						<div>
						<button style={{ display: (this.state.ShowZenMode ? "" : "none") }} className="btn btn-secondary btn-sm" type="button" onClick={this.zenPrev}>
								Prev
							</button>
						</div>
					</div>
					<div className="gap">{CUEVersion}</div>
				</div>
				<div className="left">
					<div style={{ width: "100%", height: "100%" }} id="lhseditor"></div>
				</div>
				<div className="right">
					<div style={{ width: "100%", height: "100%" }} id="rhseditor"></div>
				</div>
			</div>
		);
	}

	componentDidMount() : void {
		let l = acemodule.edit("lhseditor");
		this.lhsEditor = l;
		l.setHighlightActiveLine(false);
		l.setShowPrintMargin(false);
		l.on("change", (e : acemodule.Ace.Delta) => {
			this.inputDidChange();
		});
		l.setFontSize(editorFontSize);
		l.focus();

		let urlParams = new URLSearchParams(window.location.search);
		let id = urlParams.get("id");
		if (id != null && id != "") {
			l.setReadOnly(true);
			let app = this;
			let req = fetch(this.urlPrefix() + "/.netlify/functions/snippets?id=" + id, { headers: { "Content-Type": "text/plain;" } });
			req.then((resp : Response) => {
				return resp.text()
			}
			).then((data : string) => {
				app.lhsEditor.setValue(data);
				app.lhsEditor.clearSelection();
				app.lhsEditor.setReadOnly(false);
				app.setState({ ...this.state, Saved: true });
			}).catch((error) => {
				// TODO improve this
				console.log("Error loading snippet with id=" + id, error);
			});
		}

		let r = acemodule.edit("rhseditor");
		this.rhsEditor = r;
		r.setHighlightActiveLine(false);
		r.setShowPrintMargin(false);
		r.setHighlightGutterLine(false);
		r.setReadOnly(true);
		r.setFontSize(editorFontSize);
		r.setValue("// ... loading WASM");
		this.rhsEditor.clearSelection();

		// TODO this feels a bit gross; better way to hide the cursor?
		(r.renderer as any).$cursorLayer.element.style.opacity = 0;
	}

	private urlPrefix() : string {
		if (window.location.host.startsWith("localhost")) {
			return "http://localhost:8081";
		}
		return "";
	}
	private urlHashChanged(ev : HashChangeEvent) {
		this.setState(this.urlHashToState());
		this.updateOutput();
	}

	private urlHashToState() : AppState {
		let hash = window.location.hash;
		if (hash.startsWith("#")) {
			hash = hash.slice(1);
		}
		let h = hash.split("@");
		let inputStr = "";
		let funcStr = "";
		let outputStr = "";
		if (h.length === 3) {
			inputStr = h[0].trim();
			funcStr = h[1].trim();
			outputStr = h[2].trim();
		}
		let input = inputOptions[0];
		let func = funcOptions[0];
		let output = outputOptions[0];
		for (let o of inputOptions) {
			if (inputStr === o.key) {
				input = o;
			}
		}
		for (let o of funcOptions) {
			if (funcStr === o.key) {
				func = o;
			}
		}
		for (let o of outputOptions) {
			if (outputStr === o.key) {
				output = o;
			}
		}
		// TODO: move this validation logic elsewhere
		if (func.key == "def") {
			if (input.key != "cue") {
				func = funcOptions[0];
			}
			if (output.key != "cue") {
				output = outputOptions[0];
			}
		}
		if (input.key !== inputStr || func.key !== funcStr || output.key !== outputStr) {
			window.location.hash = HashOptions(input, func, output);
		}
		return { ...this.state, Input: input, Func: func, Output: output };
	}

	private inputDidChange() : void {
		if (this.state.Saved) {
			window.history.pushState({}, "CUE Playground", "?id=" + window.location.hash)
			this.setState({ ...this.state, Saved: false, ShowSaveURL: false });
		}
		this.updateOutput();
	}

	private updateOutput() : void {
		if (this.props.WasmAPI.CUECompile === undefined || this.lhsEditor === undefined) {
			return;
		}
		let pre = this.lhsEditor.getValue();
		let post = this.props.WasmAPI.CUECompile(this.state.Input.key, this.state.Func.key, this.state.Output.key, pre);
		let val = post.error;
		if (val === "") {
			val = post.value;
		}
		this.rhsEditor.setValue(val);
		this.rhsEditor.clearSelection();
	}

	private zenNext() : void {
		let nextExercise = this.state.ZenCurrentExercise + 1;
		if (nextExercise >= zenExercises.length)
			return;

		this.setState({ ...this.state, ZenCurrentExercise: nextExercise });
		this.lhsEditor.setValue(zenExercises[nextExercise]);
	}

	private zenPrev() : void {
		let prevExercise = this.state.ZenCurrentExercise - 1;
		if (prevExercise < 0)
			return;

		this.setState({ ...this.state, ZenCurrentExercise: prevExercise });
		this.lhsEditor.setValue(zenExercises[prevExercise]);
	}

	private zen() : void {
		if (this.state.ShowZenMode) {
			// TODO: save user's old content?
			this.setState({ ...this.state, ShowZenMode: false });
			this.lhsEditor.setValue("// exited Zen");
		} else {
			this.setState({ ...this.state, ShowZenMode: true });
			this.lhsEditor.setValue(zenExercises[this.state.ZenCurrentExercise]);
		}
	}
	private share() : void {
		let contents = this.lhsEditor.getValue();
		let req = fetch(this.urlPrefix() + "/.netlify/functions/snippets", {
			method: "POST",
			headers: { "Content-Type": "text/plain;" },
			body: contents,
		});
		req.then((resp : Response) => {
			return resp.text();
		}).then((data : string) => {
			window.history.pushState({}, "CUE Playground", "?id=" + data + window.location.hash)
			this.setState({ ...this.state, Saved: true, ShowSaveURL: true });
		}).catch((error) => {
			// TODO improve this
			console.log("Failed to share", error);
		});
	}
}

const zenExercises = [
`// Welcome to the Zen of CUE.
//
// Here are some snippets that will help you understand the language.
`,
`// These values are said to be concrete
//
// They do not refer to types, but instances of a type

a: 1
b: true
c: 1.0
d: "hello"
`,
`// Types can be used as values

w: int
x: bool
y: float
z: string
`,
`// CUE will only export concrete values
//
// (SWITCH to output to JSON or YAML)

a: 1
b: true
c: 1.0
d: "hello"
`,
`// CUE will complain if you try to export incomplete values.
//
// (SWITCH to output to JSON or YAML)

w: int
x: bool
y: float
z: string
`,
`// A value that is a type is not a concrete value acts as a constraint

a: int
a: 1
`,
`// A type mismatch will cause an error

a: int
a: "1"
`,
`// We can use a range as a constraint

a: <5
a: 4
`,
`// Such constraints are also incomplete values:

a: <5
`,
`// We can specify the same value as much as we like with no conflicts:

a: 10
a: 10
a: 10
`,
`// Conflicting values cause an error:

a: 10
a: 11
`,
`// Cue orders all values in a value lattice.
//
// It is a hierarchy.
// number subsumes int subsumes 1

a: number
b: int
c: 1
`,
`// All lattices have a single value at the top (the root) and the bottom (the leaf).
//
// top ('_') is the most general type that subsumes all other types
// bottom ('_|_') is at the bottom and is indicative of an error

top:_
a: number
b: int
c: 1
bottom:_|_
`,
`// CUE provides special operators for expanding to different parts of the lattice implied by an expression.
//
// The meet operator ('&') is an n-ary operator that expands to the greatest lower bound of its operands
// The join operator ('|') is an n-ary operator that expands to the greatest upper bound of its operands
//
// (SWITCH to output to JSON or YAML) to see that 'b' is incomplete

a: 2 & int & number & _        // the greatest lower bound is 2
b: _|_ | 2 | int | number | _  // the greatest upper bound is _

`,
`// We can create bounds with the meet operator:

a: >=3 & <8
a: 5
`,
`// We can also create lexicographical bounds:

a: >"b" & <"d"
a: "c"
`,
`// The join operator ('|') can be used to express disjunctions
// AKA sum types, to allow different type constraints:

a: int | string
a: 10
`,
`// We can also use the join operator ('|') to express a constraint
// that is an enumerated set:

a: 1 | 2 | 3
a: 1
`,
`// We can use the preference mark '*' to indicate a default value.
//
// In this case 'a' will default to 10.
//
// (SWITCH to output to JSON or YAML)

a: int | *10
`,
`// We can hide values.

_a: 1
`,
`// Hidden values do not need to be concrete
//
// (SWITCH to output to JSON or YAML)

_a: int
`,
`// We can create definitions with '#', i.e. a user-defined type.
//
// (SWITCH to output to JSON or YAML)

#a: int
b: #a
`,
`// We can use default values with definitions also.
//
//(SWITCH to output to JSON or YAML)

#a: int | *1
b: #a
`,
`// Now a type definition with concrete value.
//
// (SWITCH to output to JSON or YAML)

#a: int
b: #a
b: 1
`,
`// We can even hide definitions from other files.

_#a: int
`,
`// We can use top ('_') to specify any type.

#a: _

b: #a
b: 1

c: #a
c: "x"

d: #a
d: b
`,
`// CUE can interpolate values.
//
// Enclose the reference in '\\(' and ')'

a: "b"
(a): 2
c: "\\(a)" // string interpolation
`,
`// The same value and type principles apply with lists.
//
// Closed lists have a fixed length:

a: [int, int]
a: [1, 2]
`,
`// Open lists as indicated by ('...') do not:

b: [...int]
b: [1, 2, 3]

c: [...]
c: ["1", 1]
`,
`// CUE behaves as expected when conflicts arise with lists
//
// values for 'a' conflict, there is a length mismatch for 'b'
a:[1]
a:[2]

b:[]
b:[1]
`,
`// We can get a lists length:

b: [1, 2, 3]
l: len(b)
`,
`// 'list' provides list methods:

import "list"

a: list.Repeat([int], 4) // list of 4 ints
a: [1, 2, 3, 4]
`,
`// We can enforce uniqueness in a list with 'UniqueItems()'.
//
// List 'l' will propagate an error.

import "list"

l:[1, 2, 1]
hasUniqueItems: list.UniqueItems(l) & true
`,
`// We can test for membership in a list with 'Contains()':

import "list"

l: [1, 2, 1]
if list.Contains(l, 1) {
o: "contains 1"
}
`,
`// We can iterate over a list with 'Range()':

import "list"

l: ["a", "b", "c"]
m: [for i in list.Range(0, len(l), 1) {"\\(i)": l[i]}]
`,
`// Structs are a key-value data structures similar to those in other programming languages:

a: {}
`,
`// They can have fields:

a:
{
"x": 1
"y": 2
}
`,
`// Accessing fields on structs:

a: {
b: 1
"e-f": 2
}

c: a.b
d: a["e-f"]
`,
`// References resolve to the nearest reference in the same scope.
//
// 'f: d' resolves to 3:

a: {
b: {
c: 1
d: 3
e: {
f: d
}
}
d: 2
}
`,
`// We can use an alias to access a shadowed field:

a: {
let D = d

b: {

c: 1
d: 3
e: {
f: d
g: D
}
}
d: 2
}
`,
`// An open struct is merged into another struct:

a: {
"y": 1
}

a: {
"x": 1
}
`,
`// Closed structs do not allow the structure to be changed:

a: close({
"x": 1
})

a: {
"y": 2
}
`,
`// We can subsume multiple structs with the meet operator:

a: {
"x": 1
}

b: {
"y": 2
}

c: a & b
`,
`// Struct definitions are closed so extra fields are not allowed:

#a: {
"x": 1
}

b: {
"y": 2
}

c: #a & b
`,
`// Struct definition acceptably merged:

#a: {
"x": int
}

b: {
"x": 1
}

c: #a & b
`,
`// In this case, we do not wish to have '_b' as well.
//
// So, we hide it:

#a: {
"x": int
}

_b: {
"x": 1
}

c: #a & _b
`,
`// We can have a disjunction of structs:

a: {
"x": 1
"y": 2
} | {
"x": 3
"y": 4
}

a: {
"x": 1
"y": 2
}
`,
`// Structs can be nested:

b: {
a
"y": 2
}
`,
`// We can use templates to inject values into structs:

a:[Name=_]: {
"b": Name
}

a:"Jan":{
}

a: "Jon": {
}`,
]
