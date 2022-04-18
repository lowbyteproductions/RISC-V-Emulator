import * as cp from 'child_process';
import { AssemblyInstructionInfo, AssemblySectionInfo, disassemblyParser } from './parser';

const runProg = (command: string) => new Promise<{stdout: string, stderr: string}>((resolve, reject) => {
  cp.exec(command, (err, stdout, stderr) => {
    if (err) return reject(err);
    return resolve({ stdout, stderr });
  });
});

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
