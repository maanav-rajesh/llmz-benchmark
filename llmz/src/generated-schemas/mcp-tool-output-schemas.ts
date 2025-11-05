export const mcpToolOutputSchemas: Record<string, { [key: string]: unknown }> =
  {
    read_file: {
      type: "object",
      description:
        "Read the complete contents of a file as text. DEPRECATED: Use read_text_file instead.",
      properties: {
        content: {
          type: "string",
          description: "The text content of the file (empty string if error)",
        },
      },
      required: ["content"],
      additionalProperties: false,
    },

    read_text_file: {
      type: "object",
      description:
        "Read the complete contents of a file from the file system as text. Handles various text encodings and provides detailed error messages if the file cannot be read. Use this tool when you need to examine the contents of a single file. Use the 'head' parameter to read only the first N lines of a file, or the 'tail' parameter to read only the last N lines of a file. Operates on the file as text regardless of extension. Only works within allowed directories.",
      properties: {
        content: {
          type: "string",
          description: "The text content of the file (empty string if error)",
        },
        encoding: {
          type: "string",
          description: "The detected or used text encoding (e.g., 'utf-8')",
        },
        lineCount: {
          type: "number",
          description: "Total number of lines in the file",
        },
      },
      required: ["content", "encoding", "lineCount"],
      additionalProperties: false,
    },

    read_media_file: {
      type: "object",
      description:
        "Read an image or audio file. Returns the base64 encoded data and MIME type. Only works within allowed directories.",
      properties: {
        data: {
          type: "string",
          description: "Base64 encoded file content",
        },
        mimeType: {
          type: "string",
          description:
            "MIME type of the media file (e.g., 'image/png', 'audio/mp3')",
        },
        size: {
          type: "number",
          description: "File size in bytes",
        },
      },
      required: ["data", "mimeType", "size"],
      additionalProperties: false,
    },

    read_multiple_files: {
      type: "object",
      description:
        "Read the contents of multiple files simultaneously. This is more efficient than reading files one by one when you need to analyze or compare multiple files. Each file's content is returned with its path as a reference. Failed reads for individual files won't stop the entire operation. Only works within allowed directories.",
      properties: {
        results: {
          type: "array",
          description: "Array of file read results",
          items: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path of the file",
              },
              content: {
                type: ["string", "null"],
                description: "File content if successfully read",
              },
            },
            required: ["path", "content"],
            additionalProperties: false,
          },
        },
        totalFiles: {
          type: "number",
          description: "Total number of files attempted",
        },
        successCount: {
          type: "number",
          description: "Number of files successfully read",
        },
      },
      required: ["results", "totalFiles", "successCount"],
      additionalProperties: false,
    },

    write_file: {
      type: "object",
      description:
        "Create a new file or completely overwrite an existing file with new content. Use with caution as it will overwrite existing files without warning. Handles text content with proper encoding. Only works within allowed directories.",
      properties: {
        success: {
          type: "boolean",
          description: "Whether the file was written successfully",
        },
        path: {
          type: "string",
          description: "Path where the file was written",
        },
        bytesWritten: {
          type: "number",
          description: "Number of bytes written to the file",
        },
      },
      required: ["success", "path", "bytesWritten"],
      additionalProperties: false,
    },

    edit_file: {
      type: "object",
      description:
        "Make line-based edits to a text file. Each edit replaces exact line sequences with new content. Returns a git-style diff showing the changes made. Only works within allowed directories.",
      properties: {
        success: {
          type: "boolean",
          description: "Whether all edits were applied successfully",
        },
        diff: {
          type: "string",
          description: "Git-style diff showing the changes made",
        },
        editsApplied: {
          type: "number",
          description: "Number of edits successfully applied",
        },
        totalEdits: {
          type: "number",
          description: "Total number of edits requested",
        },
      },
      required: ["success", "diff", "editsApplied", "totalEdits"],
      additionalProperties: false,
    },

    create_directory: {
      type: "object",
      description:
        "Create a new directory or ensure a directory exists. Can create multiple nested directories in one operation. If the directory already exists, this operation will succeed silently. Perfect for setting up directory structures for projects or ensuring required paths exist. Only works within allowed directories.",
      properties: {
        success: {
          type: "boolean",
          description: "Whether the directory was created successfully",
        },
        path: {
          type: "string",
          description: "Path of the created directory",
        },
        created: {
          type: "boolean",
          description: "True if newly created, false if already existed",
        },
      },
      required: ["success", "path", "created"],
      additionalProperties: false,
    },

    list_directory: {
      type: "object",
      description:
        "Get a detailed listing of all files and directories in a specified path. Results clearly distinguish between files and directories with [FILE] and [DIR] prefixes. This tool is essential for understanding directory structure and finding specific files within a directory. Only works within allowed directories.",
      properties: {
        entries: {
          type: "array",
          description: "List of directory entries parsed from MCP text output",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the file or directory",
              },
              type: {
                type: "string",
                enum: ["FILE", "DIR"],
                description: "Type of the entry",
              },
            },
            required: ["name", "type"],
            additionalProperties: false,
          },
        },
      },
      required: ["entries"],
      additionalProperties: false,
    },

    list_directory_with_sizes: {
      type: "object",
      description:
        "Get a detailed listing of all files and directories in a specified path, including sizes. Results clearly distinguish between files and directories with [FILE] and [DIR] prefixes. This tool is useful for understanding directory structure and finding specific files within a directory. Only works within allowed directories.",
      properties: {
        entries: {
          type: "array",
          description:
            "List of directory entries with sizes parsed from MCP text output",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the file or directory",
              },
              type: {
                type: "string",
                enum: ["FILE", "DIR"],
                description: "Type of the entry",
              },
              size: {
                type: "number",
                description: "Size in bytes (0 for directories)",
              },
            },
            required: ["name", "type", "size"],
            additionalProperties: false,
          },
        },
      },
      required: ["entries"],
      additionalProperties: false,
    },

    directory_tree: {
      type: "object",
      description:
        "Get a recursive tree view of files and directories as a JSON structure. WITH RELATIVE PATHS FROM THE INPUT PATH ARGUMENT. Each entry includes 'name', 'type' (file/directory), and 'children' for directories. Files have no children array, while directories always have a children array (which may be empty). The output is formatted with 2-space indentation for readability. Only works within allowed directories.",
      properties: {
        entries: {
          type: "array",
          description:
            "Flat list of all files and directories in the tree with relative paths",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the file or directory",
              },
              path: {
                type: "string",
                description: "RELATIVE PATH FROM THE INPUT PATH ARGUMENT to the file or directory",
              },
              type: {
                type: "string",
                enum: ["file", "directory"],
                description: "Type of entry",
              },
            },
            required: ["name", "path", "type"],
            additionalProperties: false,
          },
        },
      },
      required: ["entries"],
      additionalProperties: false,
    },

    move_file: {
      type: "object",
      description:
        "Move or rename files and directories. Can move files between directories and rename them in a single operation. If the destination exists, the operation will fail. Works across different directories and can be used for simple renaming within the same directory. Both source and destination must be within allowed directories.",
      properties: {
        success: {
          type: "boolean",
          description: "Whether the move operation succeeded",
        },
        source: {
          type: "string",
          description: "Original file path",
        },
        destination: {
          type: "string",
          description: "New file path after move",
        },
        operation: {
          type: "string",
          enum: ["moved", "renamed"],
          description: "Type of operation performed",
        },
      },
      required: ["success", "source", "destination", "operation"],
      additionalProperties: false,
    },

    search_files: {
      type: "object",
      description:
        "Recursively search for files and directories matching a pattern. Searches through all subdirectories from the starting path. The search is case-insensitive and matches partial names. Returns full paths to all matching items. Great for finding files when you don't know their exact location. Only searches within allowed directories.",
      properties: {
        matches: {
          type: "array",
          description: "List of matching file paths",
          items: {
            type: "string",
            description: "Full path to matching file or directory",
          },
        },
        searchPath: {
          type: "string",
          description: "Root path where search was performed",
        },
        pattern: {
          type: "string",
          description: "Search pattern used",
        },
        totalMatches: {
          type: "number",
          description: "Total number of matches found",
        },
      },
      required: ["matches", "searchPath", "pattern", "totalMatches"],
      additionalProperties: false,
    },

    get_file_info: {
      type: "object",
      description:
        "Retrieve detailed metadata about a file or directory. Returns comprehensive information including size, creation time, last modified time, permissions, and type. This tool is perfect for understanding file characteristics without reading the actual content. Only works within allowed directories.",
      properties: {
        exists: {
          type: "boolean",
          description: "Whether the file or directory exists",
        },
        path: {
          type: "string",
          description: "Full path to the file",
        },
        name: {
          type: "string",
          description: "File or directory name",
        },
        type: {
          type: "string",
          enum: ["file", "directory"],
          description: "Type of the entry",
        },
        size: {
          type: "number",
          description: "Size in bytes",
        },
        createdAt: {
          type: "string",
          description: "ISO 8601 creation timestamp",
        },
        modifiedAt: {
          type: "string",
          description: "ISO 8601 last modification timestamp",
        },
        permissions: {
          type: "object",
          properties: {
            readable: {
              type: "boolean",
              description: "Whether file is readable",
            },
            writable: {
              type: "boolean",
              description: "Whether file is writable",
            },
            executable: {
              type: "boolean",
              description: "Whether file is executable",
            },
          },
          required: ["readable", "writable", "executable"],
          additionalProperties: false,
        },
      },
      required: [
        "exists",
        "path",
        "name",
        "type",
        "size",
        "createdAt",
        "modifiedAt",
        "permissions",
      ],
      additionalProperties: false,
    },

    list_allowed_directories: {
      type: "object",
      description:
        "Returns the list of directories that this server is allowed to access. Subdirectories within these allowed directories are also accessible. Use this to understand which directories and their nested paths are available before trying to access files.",
      properties: {
        directories: {
          type: "array",
          description: "List of allowed directory paths",
          items: {
            type: "string",
            description: "Absolute path to an allowed directory",
          },
        },
        count: {
          type: "number",
          description: "Number of allowed directories",
        },
      },
      required: ["directories", "count"],
      additionalProperties: false,
    },
  } as const;
