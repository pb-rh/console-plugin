import * as React from 'react';
import { useFormikContext } from 'formik';
import * as _ from 'lodash';
import { TaskKind } from '../../../types';
import {
  CatalogItem,
  ExtensionHook,
  ResourceIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  TaskProviders,
  TektonTaskAnnotation,
  TektonTaskLabel,
} from '../../task-quicksearch/pipeline-quicksearch-utils';
import { ARTIFACTHUB } from '../apis/artifactHub';
import { getModelReferenceFromTaskKind } from '../../utils/pipeline-augment';
import { PipelineBuilderFormikValues } from '../../pipeline-builder/types';
import { t } from '../../utils/common-utils';

const normalizeTektonTasks = (
  tektonTasks: TaskKind[],
): CatalogItem<TaskKind>[] => {
  const normalizedTektonTasks: CatalogItem<TaskKind>[] = _.reduce(
    tektonTasks,
    (acc, task) => {
      const {
        uid,
        name,
        annotations = {},
        creationTimestamp,
        labels = {},
      } = task.metadata;
      const { description } = task.spec;
      const tags =
        annotations[TektonTaskAnnotation.tags]?.split(/\s*,\s*/) || [];
      const categories =
        annotations[TektonTaskAnnotation.categories]?.split(/\s*,\s*/) || [];
      const provider =
        annotations[TektonTaskAnnotation.installedFrom] || TaskProviders.redhat;
      const versions =
        annotations[TektonTaskAnnotation.installedFrom] === ARTIFACTHUB
          ? labels[TektonTaskLabel.version]
            ? [
                {
                  id: annotations[TektonTaskAnnotation.semVersion],
                  version: annotations[TektonTaskAnnotation.semVersion],
                },
              ]
            : []
          : labels[TektonTaskLabel.version]
          ? [
              {
                id: labels[TektonTaskLabel.version],
                version: labels[TektonTaskLabel.version],
              },
            ]
          : [];
      const normalizedTektonTask: CatalogItem<TaskKind> = {
        uid,
        type: TaskProviders.redhat,
        name,
        description,
        provider,
        tags,
        creationTimestamp,
        icon: {
          node: (
            <ResourceIcon kind={getModelReferenceFromTaskKind(task.kind)} />
          ),
        },
        attributes: {
          installed:
            annotations[TektonTaskAnnotation.installedFrom] === ARTIFACTHUB
              ? annotations[TektonTaskAnnotation.semVersion]
              : labels[TektonTaskLabel.version],
          versions,
          categories,
        },
        cta: {
          label: t('Add'),
          callback: () => {},
        },
        data: task,
      };
      acc.push(normalizedTektonTask);
      return acc;
    },
    [],
  );

  return normalizedTektonTasks;
};

const useTasksProvider: ExtensionHook<CatalogItem[]> = (): [
  CatalogItem[],
  boolean,
  string,
] => {
  const { values, status } = useFormikContext<PipelineBuilderFormikValues>();
  const {
    taskResources: { namespacedTasks, clusterResolverTasks, tasksLoaded },
  } = values;

  const tektonTasks = React.useMemo(
    () => _.filter([...namespacedTasks, ...clusterResolverTasks]),
    [namespacedTasks, clusterResolverTasks],
  );

  const normalizedTektonTasks = React.useMemo(
    () => normalizeTektonTasks(tektonTasks),
    [tektonTasks],
  );
  return [normalizedTektonTasks, tasksLoaded, status?.taskLoadingError];
};

export default useTasksProvider;
