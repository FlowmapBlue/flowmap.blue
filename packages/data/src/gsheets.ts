import {DSVRowString} from 'd3-dsv';
import {LoadingState, LoadingStatus} from './LoadingState';

const BASE_URL = `https://docs.google.com/spreadsheets/d`;

export const makeSheetQueryUrl = (
  spreadSheetKey: string,
  sheet: string,
  query: string,
  format: 'csv' | 'json' = 'json'
) =>
  `${BASE_URL}/${spreadSheetKey}/gviz/tq?tq=${encodeURI(
    `${query} OPTIONS no_format`
  )}&tqx=out:${format}&sheet=${encodeURIComponent(sheet)}`;

export type CellValue = {
  v: string | number;
  f: string;
};

export type SheetData = {
  version: string;
  status: string;
  table: {
    cols: {
      id: string;
      label: string;
      type: string;
    }[];
    rows: {
      c: CellValue[];
    }[];
  };
};


export const fetchGsheet = async <Row>(url: string): Promise<LoadingState<Row[]>> => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'text/plain' // to avoid slow CORS pre-flight requests
      }
    });
    // if (response.headers.get('content-length') === '0' || response.status === 204) {
    //   return;
    // }
    if (response.status >= 200 && response.status < 300) {
      const text = await response.text();
      let rows;
      const json = parseGsheetsJson(text) as SheetData;
      rows = getSheetDataAsArray(json) as unknown as Row[];
      if (json.status !== 'ok') {
        throw new Error(`Error loading data from Google Sheets`);
      }
      return { status: LoadingStatus.DONE, data: rows };
    } else {
      return { status: LoadingStatus.ERROR };
    }
  } catch (err) {
    console.error(err);
    return { status: LoadingStatus.ERROR };
  }
};


export function getSheetDataAsArray(data: SheetData) {
  if (!data || !data.table || !data.table.cols || !data.table.rows) {
    return [];
  }
  const numCols = data.table.cols.length;
  const getValue = (v: CellValue) => {
    if (v == null || (v.v == null && v.f == null)) return undefined;
    return `${v.v != null ? v.v : v.f}`.trim();
  };

  let rows, colNames: (string | undefined)[];
  if (!data.table.cols.find((col) => col.label != null && col.label.length > 0)) {
    // header row was not properly recognized
    rows = data.table.rows.slice(1);
    colNames = data.table.rows[0].c.map(getValue);
  } else {
    rows = data.table.rows;
    colNames = data.table.cols.map(({ label }) => `${label}`.trim());
  }
  return rows.map((row) => {
    const obj: { [key: string]: string | number | Date | undefined } = {};
    for (let i = 0; i < numCols; i++) {
      try {
        const colName = `${colNames[i]}`.trim();
        if (row.c && row.c[i]) {
          const value = getValue(row.c[i]);
          if (value != null && isGSheetsTime(value)) {
            const date = parseGSheetsTime(value);
            if (!date) {
              console.warn(`Couldn't parse date ${value}`);
              obj[colName] = value;
            } else {
              obj[colName] = date;
            }
          } else {
            obj[colName] = value;
          }
        }
      } catch (err) {
        console.warn(`Couldn't parse row ${i} from sheet`);
      }
    }
    return obj;
  });
}

const GSHEETS_TIME_VALUE_PATTERN = /^Date\((\d{4}),(\d+),(\d+),(\d+),(\d+),(\d+)\)$/;

function isGSheetsTime(input: string | undefined): boolean {
  return input != null && input.startsWith('Date') && GSHEETS_TIME_VALUE_PATTERN.test(input);
}

function parseGSheetsTime(input: string | undefined): Date | undefined {
  if (input != null) {
    const m = GSHEETS_TIME_VALUE_PATTERN.exec(input);
    if (m) {
      return new Date(+m[1], +m[2], +m[3], +m[4], +m[5], +m[6]);
    }
  }
  return undefined;
}

export function parseGsheetsJson(text: string) {
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx >= 0 && endIdx >= startIdx) {
    return JSON.parse(text.substring(startIdx, endIdx + 1));
  }
}
