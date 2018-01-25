// (C) Copyright 2015 Martin Dougiamas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Injectable } from '@angular/core';
import { CoreEventsProvider } from '../../../providers/events';
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreDelegate, CoreDelegateHandler } from '../../../classes/delegate';

/**
 * Interface that all handlers must implement.
 */
export interface CoreFileUploaderHandler extends CoreDelegateHandler {
    /**
     * Handler's priority. The highest priority, the highest position.
     * @type {string}
     */
    priority?: number;

    /**
     * Given a list of mimetypes, return the ones that are supported by the handler.
     *
     * @param {string[]} [mimetypes] List of mimetypes.
     * @return {string[]} Supported mimetypes.
     */
    getSupportedMimetypes(mimetypes: string[]): string[];

    /**
     * Get the data to display the handler.
     *
     * @return {CoreFileUploaderHandlerData} Data.
     */
    getData(): CoreFileUploaderHandlerData;
}

/**
 * Data needed to render the handler in the file picker. It must be returned by the handler.
 */
export interface CoreFileUploaderHandlerData {
    /**
     * The title to display in the handler.
     * @type {string}
     */
    title: string;

    /**
     * The icon to display in the handler.
     * @type {string}
     */
    icon?: string;

    /**
     * The class to assign to the handler item.
     * @type {string}
     */
    class?: string;

    /**
     * Action to perform when the handler is clicked.
     *
     * @param {number} [maxSize] Max size of the file. If not defined or -1, no max size.
     * @param {boolean} [upload] Whether the file should be uploaded.
     * @param {boolean} [allowOffline] True to allow selecting in offline, false to require connection.
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     * @return {Promise<CoreFileUploaderHandlerResult>} Promise resolved with the result of picking/uploading the file.
     */
    action?(maxSize?: number, upload?: boolean, allowOffline?: boolean, mimetypes?: string[])
        : Promise<CoreFileUploaderHandlerResult>;

    /**
     * Function called after the handler is rendered.
     *
     * @param {number} [maxSize] Max size of the file. If not defined or -1, no max size.
     * @param {boolean} [upload] Whether the file should be uploaded.
     * @param {boolean} [allowOffline] True to allow selecting in offline, false to require connection.
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     */
    afterRender?(maxSize: number, upload: boolean, allowOffline: boolean, mimetypes: string[]): void;
}

/**
 * The result of clicking a handler.
 */
export interface CoreFileUploaderHandlerResult {
    /**
     * Whether the file was treated (uploaded or copied to tmp folder).
     * @type {boolean}
     */
    treated: boolean;

    /**
     * The path of the file picked. Required if treated=false and fileEntry is not set.
     * @type {string}
     */
    path?: string;

    /**
     * The fileEntry of the file picked. Required if treated=false and path is not set.
     * @type {any}
     */
    fileEntry?: any;

    /**
     * Whether the file should be deleted after the upload. Ignored if treated=true.
     * @type {boolean}
     */
    delete?: boolean;

    /**
     * The result of picking/uploading the file. Ignored if treated=false.
     * @type {any}
     */
    result?: any;
}

/**
 * Data returned by the delegate for each handler.
 */
export interface CoreFileUploaderHandlerDataToReturn extends CoreFileUploaderHandlerData {
    /**
     * Handler's priority.
     * @type {number}
     */
    priority?: number;

    /**
     * Supported mimetypes.
     * @type {string[]}
     */
    mimetypes?: string[];
}

/**
 * Delegate to register handlers to be shown in the file picker.
 */
@Injectable()
export class CoreFileUploaderDelegate extends CoreDelegate {
    protected handlers: { [s: string]: CoreFileUploaderHandler } = {}; // All registered handlers.
    protected enabledHandlers: { [s: string]: CoreFileUploaderHandler } = {}; // Handlers enabled for the current site.

    constructor(loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider,
            protected eventsProvider: CoreEventsProvider) {
        super('CoreFileUploaderDelegate', loggerProvider, sitesProvider, eventsProvider);

        eventsProvider.on(CoreEventsProvider.LOGOUT, this.clearSiteHandlers.bind(this));
    }

    /**
     * Clear current site handlers. Reserved for core use.
     */
    protected clearSiteHandlers(): void {
        this.enabledHandlers = {};
    }

    /**
     * Get the handlers for the current site.
     *
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     * @return {CoreFileUploaderHandlerDataToReturn[]} List of handlers data.
     */
    getHandlers(mimetypes: string[]): CoreFileUploaderHandlerDataToReturn[] {
        let handlers = [];

        for (let name in this.enabledHandlers) {
            let handler = this.enabledHandlers[name],
                supportedMimetypes;

            if (mimetypes) {
                if (!handler.getSupportedMimetypes) {
                    // Handler doesn't implement a required function, don't add it.
                    continue;
                }

                supportedMimetypes = handler.getSupportedMimetypes(mimetypes);

                if (!supportedMimetypes.length) {
                    // Handler doesn't support any mimetype, don't add it.
                    continue;
                }
            }

            let data: CoreFileUploaderHandlerDataToReturn = handler.getData();
            data.priority = handler.priority;
            data.mimetypes = supportedMimetypes;
            handlers.push(data);
        }

        return handlers;
    }
}
