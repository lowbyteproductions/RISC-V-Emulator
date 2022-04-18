import * as A from 'arcsecond';

export type ParserResultT<P> = P extends A.Parser<infer X> ? X : never;

const validSectionIdentifier = A.regex(/^\.?[_A-Za-z][a-zA-Z0-9_-]*/);

const startOfSectionDisassembly = A.sequenceOf([
  A.str('Disassembly of section '),
  validSectionIdentifier,
  A.str(':\n')
]).map(([_, sectionName]) => sectionName);

const hexNum = A.regex(/^[0-9a-fA-F]+/);

const instruction = A.coroutine(function* () {
  const address = parseInt(yield hexNum, 16);
  yield A.char(':');
  yield A.whitespace;
  const data = parseInt(yield hexNum, 16);
  yield A.whitespace;
  const assembly: string = yield A.everyCharUntil(A.char('\n'));
  yield A.optionalWhitespace;

  return {
    address,
    data,
    assembly
  };
});
export type AssemblyInstructionInfo = ParserResultT<typeof instruction>;

const startOfFunction = A.sequenceOf([
  hexNum.map(x => parseInt(x, 16)),
  A.whitespace,
  A.char('<'),
  validSectionIdentifier,
  A.str('>:\n')
]).map(([address, _, __, name]) => ({ address, name }));

const assemblyFunction = A.coroutine(function* () {
  const functionInfo: ParserResultT<typeof startOfFunction> = yield startOfFunction;

  const instructions: AssemblyInstructionInfo[] = [];

  let done = false;
  while (!done) {
    const maybeInstruction = yield A.possibly(instruction);
    if (maybeInstruction) {
      instructions.push(maybeInstruction);
    } else {
      done = true;
    }
  }

  return {
    ...functionInfo,
    instructions
  };
});
export type AssemblyFunctionInfo = ParserResultT<typeof assemblyFunction>;

const section = A.coroutine(function* () {
  const sectionName: ParserResultT<typeof startOfSectionDisassembly> = yield startOfSectionDisassembly;
  yield A.optionalWhitespace;

  const functions: AssemblyFunctionInfo[] = [];

  let done = false;
  while (!done) {
    const maybeFunction = yield A.possibly(assemblyFunction);
    if (maybeFunction) {
      functions.push(maybeFunction);
    } else {
      done = true;
    }
  }

  return {
    name: sectionName,
    functions
  };
});
export type AssemblySectionInfo = ParserResultT<typeof section>;

export const disassemblyParser = A.coroutine(function* () {
  yield A.everythingUntil(startOfSectionDisassembly);

  const sections: AssemblySectionInfo[] = [];
  let done = false;
  while (!done) {
    const maybeSection = yield A.possibly(section);
    yield A.optionalWhitespace;
    if (maybeSection) {
      sections.push(maybeSection);
    } else {
      done = true;
    }
  }

  return sections;
});
