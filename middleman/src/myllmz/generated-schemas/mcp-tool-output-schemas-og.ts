// export const mcpToolOutputSchemas: Record<string, { [key: string]: unknown }> =
//   {
//     read_file: {
//       type: "object",
//       properties: {
//         content: {
//           type: "string",
//           description: "The text content of the file",
//         },
//         error: {
//           type: ["string", "null"],
//           description: "Error message if file reading failed",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: ["content", "error", "hasError"],
//       additionalProperties: false,
//     },

//     read_text_file: {
//       type: "object",
//       properties: {
//         content: {
//           type: "string",
//           description: "The text content of the file",
//         },
//         encoding: {
//           type: "string",
//           description: "The detected or used text encoding (e.g., 'utf-8')",
//         },
//         lineCount: {
//           type: "number",
//           description: "Total number of lines in the file",
//         },
//         error: {
//           type: ["string", "null"],
//           description: "Error message if file reading failed",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: ["content", "encoding", "lineCount", "error", "hasError"],
//       additionalProperties: false,
//     },

//     read_media_file: {
//       type: "object",
//       properties: {
//         data: {
//           type: "string",
//           description: "Base64 encoded file content",
//         },
//         mimeType: {
//           type: "string",
//           description:
//             "MIME type of the media file (e.g., 'image/png', 'audio/mp3')",
//         },
//         size: {
//           type: "number",
//           description: "File size in bytes",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: ["data", "mimeType", "size", "hasError"],
//       additionalProperties: false,
//     },

//     read_multiple_files: {
//       type: "object",
//       properties: {
//         results: {
//           type: "array",
//           description: "Array of file read results",
//           items: {
//             type: "object",
//             properties: {
//               path: {
//                 type: "string",
//                 description: "Path of the file",
//               },
//               content: {
//                 type: ["string", "null"],
//                 description: "File content if successfully read",
//               },
//               error: {
//                 type: ["string", "null"],
//                 description: "Error message if reading failed for this file",
//               },
//             },
//             required: ["path", "content", "error"],
//             additionalProperties: false,
//           },
//         },
//         totalFiles: {
//           type: "number",
//           description: "Total number of files attempted",
//         },
//         successCount: {
//           type: "number",
//           description: "Number of files successfully read",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: ["results", "totalFiles", "successCount", "hasError"],
//       additionalProperties: false,
//     },

//     write_file: {
//       type: "object",
//       properties: {
//         success: {
//           type: "boolean",
//           description: "Whether the file was written successfully",
//         },
//         path: {
//           type: "string",
//           description: "Path where the file was written",
//         },
//         bytesWritten: {
//           type: "number",
//           description: "Number of bytes written to the file",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: ["success", "path", "bytesWritten", "hasError"],
//       additionalProperties: false,
//     },

//     edit_file: {
//       type: "object",
//       properties: {
//         success: {
//           type: "boolean",
//           description: "Whether all edits were applied successfully",
//         },
//         diff: {
//           type: "string",
//           description: "Git-style diff showing the changes made",
//         },
//         editsApplied: {
//           type: "number",
//           description: "Number of edits successfully applied",
//         },
//         totalEdits: {
//           type: "number",
//           description: "Total number of edits requested",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: ["success", "diff", "editsApplied", "totalEdits", "hasError"],
//       additionalProperties: false,
//     },

//     create_directory: {
//       type: "object",
//       properties: {
//         success: {
//           type: "boolean",
//           description: "Whether the directory was created successfully",
//         },
//         path: {
//           type: "string",
//           description: "Path of the created directory",
//         },
//         created: {
//           type: "boolean",
//           description: "True if newly created, false if already existed",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: ["success", "path", "created", "hasError"],
//       additionalProperties: false,
//     },

//     list_directory: {
//       type: "object",
//       properties: {
//         entries: {
//           type: "array",
//           description: "List of directory entries",
//           items: {
//             type: "object",
//             properties: {
//               name: {
//                 type: "string",
//                 description: "Name of the file or directory",
//               },
//               type: {
//                 type: "string",
//                 enum: ["FILE", "DIR"],
//                 description: "Type of the entry",
//               },
//               fullPath: {
//                 type: "string",
//                 description: "Full path to the entry",
//               },
//             },
//             required: ["name", "type", "fullPath"],
//             additionalProperties: false,
//           },
//         },
//         totalCount: {
//           type: "number",
//           description: "Total number of entries in the directory",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: ["entries", "totalCount", "hasError"],
//       additionalProperties: false,
//     },

//     list_directory_with_sizes: {
//       type: "object",
//       properties: {
//         entries: {
//           type: "array",
//           description: "List of directory entries with size information",
//           items: {
//             type: "object",
//             properties: {
//               name: {
//                 type: "string",
//                 description: "Name of the file or directory",
//               },
//               type: {
//                 type: "string",
//                 enum: ["FILE", "DIR"],
//                 description: "Type of the entry",
//               },
//               size: {
//                 type: "number",
//                 description: "Size in bytes (0 for directories)",
//               },
//               fullPath: {
//                 type: "string",
//                 description: "Full path to the entry",
//               },
//             },
//             required: ["name", "type", "size", "fullPath"],
//             additionalProperties: false,
//           },
//         },
//         totalSize: {
//           type: "number",
//           description: "Total size of all files in bytes",
//         },
//         totalCount: {
//           type: "number",
//           description: "Total number of entries",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: ["entries", "totalSize", "totalCount", "hasError"],
//       additionalProperties: false,
//     },

//     directory_tree: {
//       type: "object",
//       properties: {
//         tree: {
//           type: "string",
//           description: "The directory tree structure as a formatted string",
//         },
//         totalFiles: {
//           type: "number",
//           description: "Total number of files in the tree",
//         },
//         totalDirectories: {
//           type: "number",
//           description: "Total number of directories in the tree",
//         },
//         rootPath: {
//           type: "string",
//           description: "Full path to the root directory",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: [
//         "tree",
//         "totalFiles",
//         "totalDirectories",
//         "rootPath",
//         "hasError",
//       ],
//       additionalProperties: false,
//     },

//     move_file: {
//       type: "object",
//       properties: {
//         success: {
//           type: "boolean",
//           description: "Whether the move operation succeeded",
//         },
//         source: {
//           type: "string",
//           description: "Original file path",
//         },
//         destination: {
//           type: "string",
//           description: "New file path after move",
//         },
//         operation: {
//           type: "string",
//           enum: ["moved", "renamed"],
//           description: "Type of operation performed",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: ["success", "source", "destination", "operation", "hasError"],
//       additionalProperties: false,
//     },

//     search_files: {
//       type: "object",
//       properties: {
//         matches: {
//           type: "array",
//           description: "List of matching file paths",
//           items: {
//             type: "string",
//             description: "Full path to matching file or directory",
//           },
//         },
//         searchPath: {
//           type: "string",
//           description: "Root path where search was performed",
//         },
//         pattern: {
//           type: "string",
//           description: "Search pattern used",
//         },
//         totalMatches: {
//           type: "number",
//           description: "Total number of matches found",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: [
//         "matches",
//         "searchPath",
//         "pattern",
//         "totalMatches",
//         "hasError",
//       ],
//       additionalProperties: false,
//     },

//     get_file_info: {
//       type: "object",
//       properties: {
//         path: {
//           type: "string",
//           description: "Full path to the file",
//         },
//         name: {
//           type: "string",
//           description: "File or directory name",
//         },
//         type: {
//           type: "string",
//           enum: ["file", "directory"],
//           description: "Type of the entry",
//         },
//         size: {
//           type: "number",
//           description: "Size in bytes",
//         },
//         createdAt: {
//           type: "string",
//           description: "ISO 8601 creation timestamp",
//         },
//         modifiedAt: {
//           type: "string",
//           description: "ISO 8601 last modification timestamp",
//         },
//         permissions: {
//           type: "object",
//           properties: {
//             readable: {
//               type: "boolean",
//               description: "Whether file is readable",
//             },
//             writable: {
//               type: "boolean",
//               description: "Whether file is writable",
//             },
//             executable: {
//               type: "boolean",
//               description: "Whether file is executable",
//             },
//           },
//           required: ["readable", "writable", "executable"],
//           additionalProperties: false,
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: [
//         "path",
//         "name",
//         "type",
//         "size",
//         "createdAt",
//         "modifiedAt",
//         "permissions",
//         "hasError",
//       ],
//       additionalProperties: false,
//     },

//     list_allowed_directories: {
//       type: "object",
//       properties: {
//         directories: {
//           type: "array",
//           description: "List of allowed directory paths",
//           items: {
//             type: "string",
//             description: "Absolute path to an allowed directory",
//           },
//         },
//         count: {
//           type: "number",
//           description: "Number of allowed directories",
//         },
//         hasError: {
//           type: "boolean",
//           description: "True if an error was encountered during execution",
//         },
//       },
//       required: ["directories", "count", "hasError"],
//       additionalProperties: false,
//     },
//   } as const;
