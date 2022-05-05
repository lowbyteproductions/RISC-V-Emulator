import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { AssemblyInstructionInfo, AssemblySectionInfo, disassemblyParser } from './parser';

const runProg = (command: string) => new Promise<{stdout: string, stderr: string}>((resolve, reject) => {
  cp.exec(command, (err, stdout, stderr) => {
    if (err) return reject(err);
    return resolve({ stdout, stderr });
  });
});

const fileCache: Record<string, string[]> = {};
export const addr2lineSync = (elfPath: string, pc: number, addr2lineCommand = 'riscv32-unknown-elf-addr2line') => {
  const out = cp.execSync(`${addr2lineCommand} -e ${elfPath} 0x${pc.toString(16)}`, { encoding: 'utf8' });
  // console.log(out);
  let [codePath, ln] = out.trim().split(':');
  const lineNumber = Number(ln);

  if (codePath === '??') {
    return '';
  }

  if (!(codePath in fileCache)) {
    fileCache[codePath] = fs.readFileSync(codePath, { encoding: 'utf8' }).split('\n');
  }

  return `${path.basename(codePath)} ${ln}: ${fileCache[codePath][lineNumber - 1]}`;
}

export const getELFDebugInfo = async (elfPath: string, objdumpCommand = 'riscv32-unknown-elf-objdump') => {
  const disassembly = await runProg(`${objdumpCommand} -D ${elfPath}`);
  if (disassembly.stderr) {
    throw new Error(disassembly.stderr);
  }

  const parseResult = disassemblyParser.run(disassembly.stdout);
  let sections: AssemblySectionInfo[];

  if ('result' in parseResult) {
    sections = parseResult.result;
  } else {
    throw new Error(parseResult.error);
  }

  const assemblyByAddress: Record<number, AssemblyInstructionInfo> = {};
  const addressByFunctionName: Record<string, number> = {};
  const functionNameByAddress: Record<number, string> = {};

  for (const section of sections) {
    for (const func of section.functions) {
      addressByFunctionName[func.name] = func.address;
      functionNameByAddress[func.address] = func.name;

      for (const ins of func.instructions) {
        assemblyByAddress[ins.address] = ins;
      }
    }
  }

  return {
    sections,
    assemblyByAddress,
    addressByFunctionName,
    functionNameByAddress
  };
}

export type ELFDebugInfo = Awaited<ReturnType<typeof getELFDebugInfo>>;
