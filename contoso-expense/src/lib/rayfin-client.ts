//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { RayfinClient } from "@microsoft/rayfin-client";
import type { ContosoExpenseSchema } from "../../rayfin/data/schema";
import type { AppFunctionsSchema } from "../../rayfin/functions/src/types";

type AppRayfinClient = RayfinClient<ContosoExpenseSchema, AppFunctionsSchema>;

let _client: AppRayfinClient | undefined;

/**
 * Returns the pre-configured RayfinClient singleton.
 */
export function getRayfinClient(): AppRayfinClient {
    if (!_client) {
        const apiUrl = import.meta.env.VITE_RAYFIN_API_URL;
        const publishableKey = import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY;

        if (!apiUrl || !publishableKey) {
            throw new Error(`Missing required env vars for creating rayfin client - run 'npx rayfin up'`);
        }

        _client = new RayfinClient<ContosoExpenseSchema, AppFunctionsSchema>({
            baseUrl: apiUrl,
            publishableKey,
            authStorage: true,
            useProxy: false,
            functionsBaseUrl: import.meta.env.DEV
                ? import.meta.env.VITE_RAYFIN_FUNCTIONS_URL ?? "http://localhost:7071"
                : undefined,
        });
    }

    return _client;
}