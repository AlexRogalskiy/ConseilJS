@{%
const moo = require("moo");

/*
  Assumptions:
  - Grammar defined here: http://tezos.gitlab.io/mainnet/whitedoc/michelson.html#xii-full-grammar
  - In lexer, types and instructions may have zero, one, two, or three arguments based on the keyword.
  - Issue: Some keywords like "DIP" can have zero and one arguments, and the lexer is order-dependent from top to bottom.
    This may impact parsing and lead to awkward parse errors, and needs to be addressed accordingly.
  - Issue: Splitting instructions by number of arguments hasn't been done, so certain invalid michelson expressions like
    "PAIR key key {DROP;}" will pass through even though PAIR is a constant expression. This is a false positive.
  - Issue: Some keywords were found after trial and error that were not in the grammar. Will update list accordingly.
  - Issue: There is an ambiguous parsing between commands LE and LEFT.
  - Issue: Michelson comments are not parsed.
  - Issue: In general, if you have multiple Michelson instructions in a code block, all of them, no matter how nested, 
    need to have a semicolon at the end, unless it's a singleton code block. In regular Michelson, you can have the very
    last instruction in a code block not have a semicolon.
*/

/*
  Lexer to parse keywords more efficiently.
*/
const lexer = moo.compile({
    lparen: '(',
    rparen: ')',
    lbrace: '{',
    rbrace: '}',
    ws: /[ \t]+/,
    semicolon: ";",
    comparableType: ['int', 'nat', 'string', 'bytes', 'mutez', 'bool', 'key_hash', 'timestamp'],
    constantType: ['key', 'unit', 'signature', 'operation', 'address'],
    singleArgType: ['option', 'list', 'set', 'contract'],
    doubleArgType: ['pair', 'or', 'lambda', 'map', 'big_map'],
    type: ['key', 'unit', 'signature', 'option', 'list', 'set', 'operation', 'address', 'contract', 'pair', 'or', 'lambda', 'map', 'big_map'],
    instruction: ['DROP', 'DUP', 'SWAP', 'PUSH', 'SOME', 'NONE', 'UNIT', 'IF_NONE', 'PAIR', 'CAR', 'CDR', 'LEFT', 'RIGHT', 'IF_LEFT', 'IF_RIGHT', 
    'NIL', 'CONS', 'IF_CONS', 'SIZE', 'EMPTY_SET', 'EMPTY_MAP', 'MAP',  'ITER', 'MEM',  'GET',  'UPDATE',  'IF',  'LOOP',  'LOOP_LEFT',  
    'LAMBDA', 'EXEC', 'DIP', 'FAILWITH', 'CAST', 'RENAME', 'CONCAT', 'SLICE', 'PACK', 'UNPACK', 'ADD',  'SUB',  'MUL', 'EDIV', 'ABS', 'NEG',   
    'LSL', 'LSR', 'OR', 'AND', 'XOR', 'NOT', 'COMPARE', 'EQ', 'NEQ', 'LT', 'GT', 'LE', 'GE', 'SELF', 'CONTRACT', 'TRANSFER_TOKENS', 
    'SET_DELEGATE', 'CREATE_CONTRACT', 'IMPLICIT_ACCOUNT', 'NOW', 'AMOUNT', 'BALANCE', 'CHECK_SIGNATURE', 'BLAKE2B', 'SHA256',
     'SHA512', 'HASH_KEY', 'STEPS_TO_QUOTA', 'SOURCE', 'SENDER', 'ADDRESS', 'FAIL', 'CDAR', 'CDDR', 'DUUP', 'DUUUP', 'DUUUUP', 
     'DUUUUUP', 'DUUUUUUP', 'DUUUUUUUP', 'DIIP', 'DIIIP', 'DIIIIP', 'DIIIIIP', 'DIIIIIIP', 'DIIIIIIIP', 'REDUCE', 'CMPLT', 'UNPAIR', 'CMPGT',
     'CMPLE', 'CMPGE', 'UNPAPAIR', 'CAAR', 'CDDDDADR', 'CDDADDR', 'CDADDR', 'CDADAR', 'IFCMPEQ', 'CDDDADR', 'CADAR', 'CDDDAAR',
     'CADDR', 'CDDDDR', 'CDDAAR', 'CDDADAR', 'CDDDDDR', 'CDDDDAAR', 'ASSERT_CMPGE', 'CDAAR', 'CDADR', 'CDDAR', 'CDDDR', 
     'CMPEQ', 'CAAR', 'CAAAR', 'CAAAAR', 'CAAAAAR', 'CAAAAAAR', 'CAAAAAAAR', 'CDDR', 'CDDDR', 'CDDDDR', 'CDDDDDR', 'CDDDDDDR', 'CDDDDDDDR',
     'ASSERT_CMPEQ', 'ASSERT_CMPLT' ],
    data: ['Unit', 'True', 'False', 'Left', 'Right', 'Pair', 'Some', 'None', 'instruction'],
    constantData: ['Unit', 'True', 'False', 'None', 'instruction'],
    singleArgData: ['Left', 'Right', 'Some'],
    doubleArgData: ['Pair'],
    parameter: ["parameter", "Parameter"],
    storage: ["Storage", "storage"],
    code: ["Code", "code"],
    elt: "Elt",
    number: /-?[0-9]+/,
    word: /[a-z]+/,
    string: /"(?:\\["\\]|[^\n"\\])*"/
});
%}

# Pass your lexer object using the @lexer option:
@lexer lexer

# Main endpoint, parameter, storage, and code are necessary for user usage. Instruction, data, and type are for testing purposes.
main -> instruction {% id %} | data {% id %} | type {% id %} | parameter {% id %} | storage {% id %} | code {% id %} | script {% id %}
script -> parameter _ storage _ code {% scriptToJson %} 
parameter -> %parameter _ type _ semicolons {% singleArgKeywordToJson %}
storage -> %storage _ type _ semicolons {% singleArgKeywordToJson %}
code -> %code _ subInstruction _ semicolons _ {% d => d[2] %}
  | %code _ "{};" {% d => "code {}" %}

# Grammar of a Michelson type
type -> 
    %comparableType {% keywordToJson %} 
  | %constantType {% keywordToJson %} 
  | %singleArgType _ type {% singleArgKeywordToJson %}
  | %lparen _ %singleArgType _ type %rparen {% singleArgKeywordWithParenToJson %}
  | %doubleArgType _ type _ type {% doubleArgKeywordToJson %}
  | %lparen _ %doubleArgType _ type _ type %rparen {% doubleArgKeywordWithParenToJson %}

# Helper pattern for lists of michelson instructions
subInstruction -> %lbrace _ (instruction _ %semicolon _):+ instruction _ %rbrace {% instructionSetToJson %} # fix post processor to account for extra instruction
  | %lbrace _ (instruction _ %semicolon _):+ %rbrace {% instructionSetToJson %} 
 #| %lbrace _ instruction (_ %semicolon _ instruction):+ _ %rbrace {% id %} potential fix for arbitrary semicolons in list of michelson instructions.
  | %lbrace _ instruction _ %rbrace {% d => d[2] %}
  | %lbrace _ %rbrace {% d => "" %}

# Grammar for michelson instruction.   
instruction ->
    subInstruction {% id %}
  | %instruction {% keywordToJson %}
  | %instruction _ subInstruction {% singleArgInstrKeywordToJson %}
  | %instruction _ type {% singleArgKeywordToJson %}
  | %instruction _ data {% singleArgKeywordToJson %}
  | %instruction _ type _ type _ subInstruction {% tripleArgKeyWordToJson %}
  | %instruction _ subInstruction _ subInstruction {% doubleArgInstrKeywordToJson %}
  | %instruction _ type _ type {% doubleArgKeywordToJson %}
  | %instruction _ type _ data {% doubleArgKeywordToJson %}

# Grammar for michelson data.
data ->
    %data {% keywordToJson %}
  | %data _ data {% singleArgKeywordToJson %}
  | %data _ data _ data {% doubleArgKeywordWithParenToJson %}
  | subData {% id %}
  | subElt {% id %}
  | %number {% intToJson %}
  | %string {% stringToJson %}
# Helper grammar for list of michelson data types.
subData -> 
    "{" _ (data ";" _):+ "}" {% instructionSetToJson %}
  | "(" _ (data ";" _):+ ")" {% instructionSetToJson %}
# Helper grammar for list of pairs of michelson data types.
subElt -> 
    "{" _ (elt ";" _):+ "}" {% instructionSetToJson %}
  | "(" _ (elt ";" _):+ ")" {% instructionSetToJson %}
elt -> %elt _ data _ data {% doubleArgKeywordToJson  %}

# Helper grammar for whitespace.
_ -> [\s]:*
# Helper grammar for semicolons.
semicolons -> null | semicolons ";"

@{%

    const truncatedKeywords = new Set(
      ['CAAR', 'CAAAR', 'CAAAAR', 'CAAAAAR', 'CAAAAAAR', 'CAAAAAAAR', 
       'CDDR', 'CDDDR', 'CDDDDR', 'CDDDDDR', 'CDDDDDDR', 'CDDDDDDDR', 
       'DUUP', 'DUUUP', 'DUUUUP', 'DUUUUUP', 'DUUUUUUP', 'DUUUUUUUP',  
       'CMPLT', 'CMPGT', 'CMPEQ', 'ASSERT_CMPGE', 'ASSERT_CMPEQ', 'ASSERT_CMPLT',
       'CMPLE', 'CMPGE', 'UNPAIR', 'UNPAPAIR', 
       'CDAR', 'CDDDDADR', 'CDDADDR', 'CDADDR', 'CDADAR', 'CDDDADR', 'CADAR', 'CDDDAAR', 'CADDR', 
       'CDDDDR', 'CDDAAR', 'CDDADAR', 'CDDDDDR', 'CDDDDAAR', 'CDAAR', 'CDADR', 'CDDAR', 'CDDDR', 'FAIL'])   

    //The difference between these and truncated is that these instructions have other instructions as arguments.
    const dipKeywords = new Set(
      [ 'DIIP', 'DIIIP', 'DIIIIP', 'DIIIIIP', 'DIIIIIIP', 'DIIIIIIIP']
    )   

    const replicateKeyword = (word, n) => {
      var result = []
      for (i = 0; i < n; i++) {
        result.push(keywordToJson([word]))
      }
      return result
    }   

    const expandKeyword = word => {
      switch (word) {
        case 'CAAR':
          return `[${keywordToJson(['CAR'])}, ${keywordToJson(['CAR'])}]`
        case 'CDAR':
          return `[${keywordToJson(['CDR'])}, ${keywordToJson(['CAR'])}]`         
        case 'CMPGT':
          return `[${keywordToJson(['COMPARE'])}, ${keywordToJson(['GT'])}]` 
        case 'CMPGE':
          return `[${keywordToJson(['COMPARE'])}, ${keywordToJson(['GE'])}]`    
        case 'CMPLT':
          return `[${keywordToJson(['COMPARE'])}, ${keywordToJson(['LT'])}]`   
        case 'CMPLE':
          return `[${keywordToJson(['COMPARE'])}, ${keywordToJson(['LE'])}]`  
        case 'CDDR':
          return `[${keywordToJson(['CDR'])}, ${keywordToJson(['CDR'])}]`   
        //These are equivalent by inspection of tezos node output, replace with more elegant solution later.  
        case 'UNPAIR':
          return '[ [ { "prim": "DUP" }, { "prim": "CAR" }, { "prim": "DIP", "args": [ [ { "prim": "CDR" } ] ] } ] ]'
        case 'UNPAPAIR':
          return `[ [ { "prim": "DUP" },
                     { "prim": "CAR" },
                     { "prim": "DIP", "args": [ [ { "prim": "CDR" } ] ] } ],
                     {"prim":"DIP","args":[[[{"prim":"DUP"},{"prim":"CAR"},{"prim":"DIP","args":[[{"prim":"CDR"}]]}]]]}] `
        case 'FAIL': 
          return '[ { "prim": "UNIT" }, { "prim": "FAILWITH"} ]'  
        case 'DUUUP':
          return `[{"prim":"DIP","args":[[{"prim":"DIP","args":[[{"prim":"DUP"}]]},{"prim":"SWAP"}]]},{"prim":"SWAP"}]`
        case 'DUUP':
          return `[{"prim":"DIP","args":[[{"prim":"DUP"}]]},{"prim":"SWAP"}]`   
        case 'CDDADDR':
          return `[${keywordToJson(['CDR'])}, ${keywordToJson(['CDR'])}, ${keywordToJson(['CAR'])}, ${keywordToJson(['CDR'])}, ${keywordToJson(['CDR'])}]`  
      }
    }

    const expandDIP = (dip, instruction) => { 
      switch (dip) {
        case 'DIIP':
          console.log(instruction)
          return `[{ "prim": "DIP", "args": [ [ { "prim": "DIP", "args": [ [ ${instruction} ] ] } ] ] }]`;
      }
    }
   
    /**
     * Given a int, convert it to JSON.
     * Example: "3" -> { "int": "3" }
     */
    const intToJson = d => { return `{ "int": "${parseInt(d[0])}" }`; }

    /**
     * Given a string, convert it to JSON.
     * Example: "string" -> "{ "string": "blah" }"
     */
    const stringToJson = d => { return `{ "string": ${d[0]} }`; }

    /**
     * Given a keyword, convert it to JSON.
     * Example: "int" -> "{ "prim" : "int" }"
     */
    const keywordToJson = d => { 
      //console.log(`matching keyword '${d[0]}'`)
      //console.log(truncatedKeywords)
      //console.log(`--t '${truncatedKeywords.has(d[0].toString())}'`)
      const word = `${d[0].toString()}`
      if (truncatedKeywords.has(word)) {//(truncatedKeywords.has(`${d[0].toString()}`)) {
        //console.log(`found expansion ${[expandKeyword(d[0].toString())]}`)
        //console.log([1,2,3])
        return [expandKeyword(d[0].toString())] 
      }
      else {
        //console.log(`found '${d[0]}'`)
        return `{ "prim": "${d[0]}" }`; 
      }
    }

    /**
     * Given a keyword with one argument, convert it to JSON.
     * Example: "option int" -> "{ prim: option, args: [int] }"
     */
    const singleArgKeywordToJson = d => { return `{ "prim": "${d[0]}", "args": [ ${d[2]} ] }`; }

    const singleArgInstrKeywordToJson = d => { 
      const word = `${d[0].toString()}`
      if (dipKeywords.has(word)) {
        return expandDIP(word, d[2])
      }
      else {
        return `{ "prim": "${d[0]}", "args": [ [ ${d[2]} ] ] }`; 
      }
    }

    /**
     * Given a keyword with one argument and parentheses, convert it to JSON.
     * Example: "(option int)" -> "{ prim: option, args: [{prim: int}] }"
     */
    const singleArgKeywordWithParenToJson = d => { return `{ "prim": "${d[2]}", "args": [ ${d[4]} ] }`; }

    /**
     * Given a keyword with two arguments, convert it into JSON.
     * Example: "Pair unit instruction" -> "{ prim: Pair, args: [{prim: unit}, {prim: instruction}] }"
     */
    const doubleArgKeywordToJson = d => { return `{ "prim": "${d[0]}", "args": [${d[2]}, ${d[4]}] }`; }

    const doubleArgInstrKeywordToJson = d => { return `{ "prim": "${d[0]}", "args": [ [${d[2]}], [${d[4]}] ] }`; }

    /**
     * Given a keyword with two arguments and parentheses, convert it into JSON.
     * Example: "(Pair unit instruction)" -> "{ prim: Pair, args: [{prim: unit}, {prim: instruction}] }"
     */
    const doubleArgKeywordWithParenToJson = d => { return `{ "prim": "${d[2]}", "args": [ ${d[4]}, ${d[6]} ] }`; }

    /**
     * Given a keyword with three arguments, convert it into JSON.
     * Example: "LAMBDA key unit {DIP;}" -> "{ prim: LAMBDA, args: [{prim: key}, {prim: unit}, {prim: DIP}] }"
     */
    const tripleArgKeyWordToJson = d => { return `{ "prim": "${d[0]}", "args": [ ${d[2]}, ${d[4]}, [${d[6]}] ] }`; }

    /**
     * Given a keyword with three arguments and parentheses, convert it into JSON.
     * Example: "(LAMBDA key unit {DIP;})" -> "{ prim: LAMBDA, args: [{prim: key}, {prim: unit}, {prim: DIP}] }"
     */
    const tripleArgKeyWordWithParenToJson = d =>  { return `{ "prim": "${d[0]}", "args": [ ${d[2]}, ${d[4]}, ${d[6]} ] }`; }

    const nestedArrayChecker = x => {
      if (Array.isArray(x)) {
        if (Array.isArray(x[0])) {
          return x[0]
        }
        else {
          return x
        }
      } 
      else {
        return x
      } 
    }

    /**
     * Given a list of michelson instructions, convert it into JSON.
     * Example: "{CAR; NIL operation; PAIR;}" -> 
     * [ '{ prim: CAR }',
     * '{ prim: NIL, args: [{ prim: operation }] }',
     * '{ prim: PAIR }' ]
     */
     const instructionSetToJson = d => { return d[2].map(x => x[0]).concat(d[3]).map(x => nestedArrayChecker(x)); }

    const scriptToJson = d => {
        const parameterJson = d[0];
        const storageJson = d[2];
        const codeJson = `{ "prim": "code", "args": [ [ ${d[4]} ] ] }`;
        return `[ ${parameterJson}, ${storageJson}, ${codeJson} ]`;
    }

%}
