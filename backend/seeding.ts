/**
 * this is a seperate script and not a part of the backend server.
 *
 * this is intended to be run when the database is empty to seed it with data.
 * fetches data about study programs, module handbooks and modules from the learning platform and stores it in the database.
 */
import { LearningPlatformClient } from "code-university";

import consumePaginatedQuery from "@/services/learningPlatform/consumePaginatedQuery";
import { learningPlatformModulesQuery } from "@/services/learningPlatform/hooks/useLearningPlatformModules";
import { isDefined } from "@/services/learningPlatform/util/isDefined";

import { AppDataSource, connectToDatabase } from "./datasource";
import { CompulsoryElectivePairing } from "./entities/compulsoryElectivePairing.entity";
import { Module } from "./entities/module.entity";
import { ModuleHandbook } from "./entities/moduleHandbook.entity";
import {
  StudyProgram,
  StudyProgramAbbreviation,
} from "./entities/studyProgram.entity";
import { env } from "./env";

if (!env.lp.accessToken) {
  throw new Error(
    "FATAL the 'LP_ACCESS_TOKEN' environment variable is required to run the seeding script",
  );
}

const moduleMeta: Record<string, { proficiency: number }> = {
  OS_01: { proficiency: 0 },
  OS_02: { proficiency: 0 },
  OS_03: { proficiency: 0 },
  OS_04: { proficiency: 0 },
  OS_05: { proficiency: 0 },

  IS_01: { proficiency: 0 },
  IS_02: { proficiency: 0 },
  IS_03: { proficiency: 0 },
  IS_04: { proficiency: 0 },
  IS_05: { proficiency: 0 },
  IS_06: { proficiency: 0 },

  STS_01: { proficiency: 0 },
  STS_02: { proficiency: 0 },
  STS_03: { proficiency: 0 },
  STS_04: { proficiency: 0 },
  STS_05: { proficiency: 0 },

  ID_01: { proficiency: 0 },
  ID_02: { proficiency: 0 },
  ID_03: { proficiency: 0 },
  ID_04: { proficiency: 0 },
  ID_05: { proficiency: 0 },
  ID_06: { proficiency: 0 },
  ID_08: { proficiency: 0 },
  ID_09: { proficiency: 0 },
  ID_10: { proficiency: 0 },
  ID_12: { proficiency: 0 },
  ID_13: { proficiency: 0 },
  ID_16: { proficiency: 0 },
  ID_17: { proficiency: 0 },
  ID_19: { proficiency: 0 },
  ID_20: { proficiency: 0 },
  ID_25: { proficiency: 0 },
  ID_26: { proficiency: 0 },
  ID_27: { proficiency: 0 },
  ID_28: { proficiency: 0 },
  ID_29: { proficiency: 0 },
  ID_30: { proficiency: 0 },

  PM_01: { proficiency: 0 },
  PM_02: { proficiency: 0 },
  PM_03: { proficiency: 0 },
  PM_04: { proficiency: 0 },
  PM_05: { proficiency: 0 },
  PM_06: { proficiency: 0 },
  PM_07: { proficiency: 0 },
  PM_08: { proficiency: 0 },
  PM_09: { proficiency: 0 },
  PM_11: { proficiency: 0 },
  PM_12: { proficiency: 0 },
  PM_13: { proficiency: 0 },
  PM_14: { proficiency: 0 },
  PM_15: { proficiency: 0 },
  PM_16: { proficiency: 0 },
  PM_17: { proficiency: 0 },
  PM_18: { proficiency: 0 },
  PM_19: { proficiency: 0 },
  PM_20: { proficiency: 0 },
  PM_21: { proficiency: 0 },
  PM_22: { proficiency: 0 },
  PM_24: { proficiency: 0 },
  PM_25: { proficiency: 0 },
  PM_26: { proficiency: 0 },
  PM_27: { proficiency: 0 },
  PM_28: { proficiency: 0 },

  SE_01: { proficiency: 0 }, // software development basics
  SE_02: { proficiency: 0 }, // algorithms and data structures
  SE_03: { proficiency: 2 }, // concepts of programming languages
  SE_04: { proficiency: 3 }, // network programming
  SE_05: { proficiency: 1 }, // relational databases
  SE_06: { proficiency: 1 }, // nosql databases
  SE_07: { proficiency: 2 }, // collaboration
  SE_08: { proficiency: 1 }, // clean code
  SE_09: { proficiency: 3 }, // cyber security
  SE_10: { proficiency: 1 }, // automated software testing

  SE_19: { proficiency: 1 }, // web technologies basics

  SE_35: { proficiency: 4 }, // software modeling and design patterns

  SE_41: { proficiency: 0 }, // digital fabrication
  SE_45: { proficiency: 2 }, // web frontend technologies
  SE_46: { proficiency: 2 }, // web backend technologies
};

/**
 * src: https://www.notion.so/codeuniversitywiki/University-Regulations-828ab80d0edf409d992870947bdbbdd6 -> Program-Specific Study and Examination Regulations (V1, V2, V3) -> for each handbook version, see the "Compulsory Elective" section of the pdfs
 */
const compulsoryElectivePairings: {
  department: string;
  handbookVersions: number[];
  modules: string[];
}[] = [
  {
    department: "SE",
    handbookVersions: [2, 3],
    modules: ["SE_05", "SE_06"],
  },

  {
    department: "SE",
    handbookVersions: [2],
    modules: ["IS_01", "IS_02"],
  },

  {
    department: "SE",
    handbookVersions: [3],
    modules: ["PM_24", "PM_27", "PM_28"],
  },
];

const getAbbreviation = (name: string) => {
  if (name === "BSc SE") return StudyProgramAbbreviation.SE;
  if (name === "BA ID") return StudyProgramAbbreviation.ID;
  if (name === "BA PM") return StudyProgramAbbreviation.PM;
  if (name === "BA DS") return StudyProgramAbbreviation.DS;
  if (name === "BA BM") return StudyProgramAbbreviation.BM;

  throw new Error(
    "[getAbbreviation] failed to resolve study program abbreviation: " + name,
  );
};

async function clearDatabase() {
  const runner = AppDataSource.createQueryRunner();

  await runner.connect();
  await runner.startTransaction();

  const disableForeignKeyChecks = "SET session_replication_role = replica;";
  const enableForeignKeyChecks = "SET session_replication_role = DEFAULT;";

  try {
    await runner.query(disableForeignKeyChecks);

    for (const metadata of AppDataSource.entityMetadatas) {
      await runner.query(`DELETE FROM "${metadata.tableName}";`);
    }
    await runner.query(enableForeignKeyChecks);

    await runner.commitTransaction();

    console.info("deleted existing data");
  } catch (err) {
    console.error("failed to delete existing data:", err);
    await runner.rollbackTransaction();
  } finally {
    await runner.release();
  }
}

async function main() {
  await connectToDatabase();

  await clearDatabase();

  const studyProgramRepository = AppDataSource.getRepository(StudyProgram);
  const moduleHandbookRepository = AppDataSource.getRepository(ModuleHandbook);
  const moduleRepository = AppDataSource.getRepository(Module);
  const compulsoryElectivePairingRepository = AppDataSource.getRepository(
    CompulsoryElectivePairing,
  );

  const learningPlatform = await LearningPlatformClient.fromRefreshToken(
    env.lp.accessToken!,
  );

  const studyPrograms = await learningPlatform.raw
    .query<"studyPrograms">(`query allStudyPrograms {
    studyPrograms {
        id
        name
        abbreviation
        moduleHandbooks {
          id  
          name
          validFrom
        }
    }
}`);

  const { currentSemesterModulesCount } = await learningPlatform!.raw
    .query<"currentSemesterModulesCount">(`
query {
  currentSemesterModulesCount
}`);
  const modulesPerQuery = 100;

  console.info(`fetched ${studyPrograms.studyPrograms.length} study programs`);

  const results = await consumePaginatedQuery(
    (pagination) =>
      learningPlatform!.raw.query<"currentSemesterModules">(
        learningPlatformModulesQuery,
        {
          pagination,
          filter: {},
        },
      ),
    currentSemesterModulesCount,
    modulesPerQuery,
  );

  const currentSemesterModules = results
    .flatMap((i) => i.currentSemesterModules)
    .filter(isDefined);

  console.info(`fetched ${currentSemesterModules.length} modules`);

  let savedModuleHandbooks: ModuleHandbook[] = [];
  let savedStudyPrograms: StudyProgram[] = [];
  let savedModules: Module[] = [];
  let savedCompulsoryElectivePairings: CompulsoryElectivePairing[] = [];

  for (const studyProgram of studyPrograms.studyPrograms) {
    if (studyProgram.abbreviation.includes("V4")) {
      continue;
    }

    const abbreviation = getAbbreviation(studyProgram.abbreviation);

    const studyProgramEntity = await studyProgramRepository.save(
      studyProgramRepository.create({
        lpId: studyProgram.id,
        abbreviation,
      }),
    );
    savedStudyPrograms.push(studyProgramEntity);

    for (const handbook of studyProgram.moduleHandbooks!) {
      savedModuleHandbooks.push(
        await moduleHandbookRepository.save(
          moduleHandbookRepository.create({
            lpId: handbook.id,
            studyProgramId: studyProgramEntity.id,
            name: handbook.name,
          }),
        ),
      );
    }
  }

  for (const currentModule of currentSemesterModules) {
    const meta =
      moduleMeta[currentModule.moduleIdentifier as keyof typeof moduleMeta];

    if (meta) {
      savedModules.push(
        await moduleRepository.save(
          moduleRepository.create({
            lpId: currentModule.id,
            proficiency: meta.proficiency,
            possiblyOutdated: false,
            moduleIdentifier: currentModule.moduleIdentifier!,
          }),
        ),
      );
    }
  }
  for (const pairing of compulsoryElectivePairings) {
    for (const handbookVersion of pairing.handbookVersions) {
      const handbook = savedModuleHandbooks.find((i) => {
        const [fullName, degree, department, version] =
          i.name.match(/(BA|BSc)_(SE|ID|PM)_v(\d+)/) ?? [];

        return (
          fullName != null &&
          pairing.department === department &&
          handbookVersion === parseInt(version)
        );
      });

      const modules = savedModules.filter((i) =>
        pairing.modules.includes(i.moduleIdentifier),
      );

      if (!handbook) {
        throw new Error(
          "failed to find handbook for compulsory elective pairing: " +
            pairing.department +
            " v" +
            handbookVersion,
        );
      }
      savedCompulsoryElectivePairings.push(
        await compulsoryElectivePairingRepository.save(
          compulsoryElectivePairingRepository.create({
            moduleHandbookId: handbook.id,
            modules,
          }),
        ),
      );
    }
  }

  console.info("finished seeding:");
  console.info(savedStudyPrograms.length, "study programs");
  console.info(savedModuleHandbooks.length, "module handbooks");
  console.info(savedModules.length, "modules");
  console.info(
    savedCompulsoryElectivePairings.length,
    "compulsory elective pairings",
  );

  AppDataSource.destroy();
}
main();
