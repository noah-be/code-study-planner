import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { Semester, SemesterModule } from "@/components/util/types";
import { ApiSemesterModule } from "@/services/apiClient";
import { useStudyPlan } from "@/services/apiClient/hooks/useStudyPlan";
import { useLearningPlatformAssessmentTable } from "@/services/learningPlatform/hooks/useLearningPlatformAssessmentTable";
import { useLearningPlatformSemesters } from "@/services/learningPlatform/hooks/useLearningPlatformSemesters";
import {
  getSemesterName,
  getUserUrl,
} from "@/services/learningPlatform/mapping";
import { getGradeInfo } from "@/services/learningPlatform/util/getGradeInfo";

import { SemestersListProps } from ".";
import { useModulesInScope } from "../util/useModulesInScope";

/**
 * aggregates the data for the kanban view of the study plan from both learning platform data and our own backend
 */
export function useSemestersList(): SemestersListProps {
  const studyPlan = useStudyPlan();

  useQuery({
    queryKey: ["studyPlanner", "studyPlan"],
  });

  const semestersQuery = useLearningPlatformSemesters();

  const { modules, isLoading } = useModulesInScope();

  const assessmentTableQuery = useLearningPlatformAssessmentTable();

  const toPlannedModule = (
    i: ApiSemesterModule,
  ): SemesterModule | SemesterModule[] => {
    const matchingModule = modules.find((j) => j.id === i.moduleId);

    if (!matchingModule) {
      console.warn(
        "[useSemestersList] toPlannedModule failed to resolve moduleId:",
        i.moduleId,
      );
      return [];
    }

    return {
      type: "planned",
      id: i.moduleId,

      module: matchingModule,
      assessment: null,
    };
  };

  const semesters =
    studyPlan.data?.semesters?.map<Semester>((semester) => {
      const matching = semestersQuery.data?.semesters.find(
        (i) => i.id === semester.lpId,
      );

      const canRegisterForEarlyAssessments =
        dayjs(matching?.moduleEarlyRegistrationStartDate).isBefore(dayjs()) &&
        dayjs(matching?.moduleEarlyRegistrationEndDate).isAfter(dayjs());

      const canRegisterForStandardAssessments =
        dayjs(matching?.moduleStandardRegistrationStartDate).isBefore(
          dayjs(),
        ) &&
        dayjs(matching?.moduleStandardRegistrationEndDate).isAfter(dayjs());

      const canRegisterForAlternativeAssessments =
        dayjs(matching?.moduleAlternativeRegistrationStartDate).isBefore(
          dayjs(),
        ) &&
        dayjs(matching?.moduleAlternativeRegistrationEndDate).isAfter(dayjs());

      const canRegisterForReassessments =
        dayjs(matching?.moduleReassessmentRegistrationPhaseStartDate).isBefore(
          dayjs(),
        ) &&
        dayjs(matching?.moduleReassessmentRegistrationPhaseEndDate).isAfter(
          dayjs(),
        );

      return {
        id: semester.id,
        lpId: semester.lpId,
        isActive: matching?.isActive ?? false,

        canRegisterForEarlyAssessments,
        canRegisterForStandardAssessments,
        canRegisterForAlternativeAssessments,
        canRegisterForReassessments,

        title: getSemesterName(dayjs(semester.startDate)),
        modules: {
          earlyAssessments:
            semester.modules.earlyAssessments.flatMap(toPlannedModule),
          standardAssessments:
            semester.modules.standardAssessments.flatMap(toPlannedModule),
          alternativeAssessments:
            semester.modules.alternativeAssessments.flatMap(toPlannedModule),
          reassessments:
            semester.modules.reassessments.flatMap(toPlannedModule),
        },
      };
    }) ?? [];

  const myAssessments = assessmentTableQuery.data?.myAssessments ?? [];

  for (const i of myAssessments) {
    const semester = semesters.find((j) => j.lpId === i.semester!.id);

    if (!semester) {
      console.warn(
        "[useSemestersList] failed to find semester:",
        i.semester!.id,
      );
      continue;
    }

    const category = (() => {
      if (i.assessmentStyle === "ALTERNATIVE") {
        return semester.modules.alternativeAssessments;
      }
      if (i.assessmentType === "REASSESSMENT") {
        return semester.modules.reassessments;
      }
      if (i.assessmentType === "EARLY") {
        return semester.modules.earlyAssessments;
      }
      return semester.modules.standardAssessments;
    })();

    const highestGrade = i.grade ?? null;

    const assessedModule = modules.find((j) => j.id === i.semesterModule!.id);

    if (!assessedModule) {
      console.warn(
        "[useSemestersList] failed to find module for assessment:",
        i.semesterModule!.id,
        i.semesterModule!.moduleIdentifier,
      );
      continue;
    }

    const gradeInfo = getGradeInfo(highestGrade);

    category.push({
      type: "past",
      id: i.id,
      assessment: {
        proposedDate: i.proposedDate,
        id: i.id,
        published: i.published === true,
        grade: highestGrade,
        passed: gradeInfo.passed,
        level: gradeInfo.level,
        url: "#",
        date: i.submittedOn,
        assessorName: i.assessor?.name!,
        assessorUrl: getUserUrl(i.assessor?.id!),
      },
      module: assessedModule,
    });
  }

  return {
    semesters,
    isLoading:
      isLoading ||
      assessmentTableQuery.isLoading ||
      studyPlan.isLoading ||
      semestersQuery.isLoading,
  };
}
