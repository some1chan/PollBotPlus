/**
 * The MIT License
 *
 * Copyright (c) 2015-2020 Yakdu. http://typeorm.github.io
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * ---
 *
 * Developer's Note: most of the code here is taken from this script:
 * https://github.com/typeorm/typeorm/blob/7f7e4d53119506bdbb86999606707cd740859fe7/src/logger/AdvancedConsoleLogger.ts
 *
 * This was done to output everything through Winston, and have consistent formatting.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-mixed-spaces-and-tabs */

import { Logger, QueryRunner } from "typeorm";
import { LoggerOptions } from "typeorm/logger/LoggerOptions";
import { PlatformTools } from "typeorm/platform/PlatformTools";
import Winston from "winston";

export class TypeORMLogger implements Logger {
	/**
	 * Default levels derived from npm levels
	 */
	static defaultLevels = {
		levels: {
			db_error: 0,
			db_warn: 1,
			db_info: 2,
			db_log: 3,
			db_query: 4,
			db_verbose: 5,
			db_debug: 6,
			db_silly: 7,
		},
		colors: {
			db_error: "red",
			db_warn: "yellow",
			db_info: "grey",
			db_log: "grey",
			db_query: "grey",
			db_verbose: "grey",
			db_debug: "grey",
			db_silly: "grey",
		},
	};

	constructor(private logger: Winston.Logger, private options?: LoggerOptions) {
		Winston.addColors(TypeORMLogger.defaultLevels.colors);
	}

	log(
		level: "log" | "info" | "warn",
		message: unknown,
		queryRunner?: QueryRunner
	): void {
		switch (level) {
			case "info":
				if (
					this.options === "all" ||
					(Array.isArray(this.options) && this.options.indexOf("info") !== -1)
				) {
					this.logger.log("db_info", message);
				}
				break;

			case "warn":
				if (
					this.options === "all" ||
					(Array.isArray(this.options) && this.options.indexOf("warn") !== -1)
				) {
					this.logger.log("db_warn", message);
				}
				break;

			case "log":
				if (
					this.options === "all" ||
					(Array.isArray(this.options) && this.options.indexOf("log") !== -1)
				) {
					this.logger.log("db_log", message);
				}
				break;

			default:
				throw new Error(`Invalid level "${level}"`);
		}
	}

	logMigration(message: string, queryRunner?: QueryRunner): void {
		this.logger.log("db_verbose", message);
	}

	logQuery(
		query: string,
		parameters?: unknown[],
		queryRunner?: QueryRunner
	): void {
		if (
			this.options === "all" ||
			this.options === true ||
			(Array.isArray(this.options) && this.options.indexOf("query") !== -1)
		) {
			const sql =
				query +
				(parameters && parameters.length
					? " -- PARAMETERS: " + this.stringifyParams(parameters)
					: "");
			this.logger.log("db_query", `${PlatformTools.highlightSql(sql)}`);
		}
	}

	logQueryError(
		error: string,
		query: string,
		parameters?: unknown[],
		queryRunner?: QueryRunner
	): void {
		if (
			this.options === "all" ||
			this.options === true ||
			(Array.isArray(this.options) && this.options.indexOf("error") !== -1)
		) {
			const sql =
				query +
				(parameters && parameters.length
					? " -- PARAMETERS: " + this.stringifyParams(parameters)
					: "");
			this.logger.log(
				"db_error",
				`query failed: ${PlatformTools.highlightSql(sql)}`
			);
			this.logger.log("db_error", `error: ${error}`);
		}
	}

	logQuerySlow(
		time: number,
		query: string,
		parameters?: unknown[],
		queryRunner?: QueryRunner
	): void {
		const sql =
			query +
			(parameters && parameters.length
				? " -- PARAMETERS: " + this.stringifyParams(parameters)
				: "");
		this.logger.log(
			"db_warn",
			`query is slow: ${PlatformTools.highlightSql(sql)}`
		);
		this.logger.log("db_warn", `execution time: ${time}`);
	}

	logSchemaBuild(message: string, queryRunner?: QueryRunner): void {
		if (
			this.options === "all" ||
			(Array.isArray(this.options) && this.options.indexOf("schema") !== -1)
		) {
			this.logger.log("db_log", message);
		}
	}

	/**
	 * Converts parameters to a string.
	 * Sometimes parameters can have circular objects and therefor we are handle this case too.
	 *
	 * Note: this function was copied from TypeORM, with changes to match the strict TypeScript environment
	 * @see https://github.com/typeorm/typeorm/blob/7f7e4d53119506bdbb86999606707cd740859fe7/src/logger/AdvancedConsoleLogger.ts#L98
	 */
	protected stringifyParams(parameters: unknown[]): unknown {
		try {
			return JSON.stringify(parameters);
		} catch (error) {
			// Most probably circular objects in parameters
			return parameters;
		}
	}
}
