interface ProjectVersionInsertError {
  code?: string | null;
  message: string;
}

interface ProjectVersionInsertResult<T> {
  data: T | null;
  error: ProjectVersionInsertError | null;
  droppedColumns: string[];
}

const MISSING_COLUMN_PATTERN =
  /Could not find the '([^']+)' column of 'project_versions' in the schema cache/i;

function getMissingProjectVersionsColumn(error: ProjectVersionInsertError | null): string | null {
  if (!error?.message) {
    return null;
  }

  const match = error.message.match(MISSING_COLUMN_PATTERN);
  return match?.[1] ?? null;
}

export async function insertProjectVersionWithFallback<T>(
  supabase: {
    from: (table: string) => {
      insert: (payload: Record<string, unknown>) => {
        select: (columns: string) => {
          single: () => Promise<{ data: T | null; error: ProjectVersionInsertError | null }>;
        };
      };
    };
  },
  insertData: Record<string, unknown>,
  selectColumns: string = "id"
): Promise<ProjectVersionInsertResult<T>> {
  const payload = { ...insertData };
  const droppedColumns: string[] = [];
  const attemptedColumns = new Set<string>();

  while (true) {
    const { data, error } = await supabase
      .from("project_versions")
      .insert({ ...payload })
      .select(selectColumns)
      .single();

    if (!error) {
      return {
        data,
        error: null,
        droppedColumns,
      };
    }

    const missingColumn = getMissingProjectVersionsColumn(error);
    if (!missingColumn || !(missingColumn in payload) || attemptedColumns.has(missingColumn)) {
      return {
        data: null,
        error,
        droppedColumns,
      };
    }

    attemptedColumns.add(missingColumn);
    droppedColumns.push(missingColumn);
    delete payload[missingColumn];
  }
}
