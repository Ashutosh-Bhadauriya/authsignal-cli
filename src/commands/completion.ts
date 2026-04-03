import { Command } from "commander";
import { withErrorHandler } from "../utils.js";

const BASH_COMPLETION = `###-begin-authsignal-completions-###
_authsignal_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  commands="config users authenticators actions action-configs rules tenant theme value-lists status completion open api help"

  case "\${COMP_WORDS[1]}" in
    config)
      COMPREPLY=( $(compgen -W "set get regions" -- "$cur") )
      return 0 ;;
    users)
      COMPREPLY=( $(compgen -W "list get update delete" -- "$cur") )
      return 0 ;;
    authenticators)
      COMPREPLY=( $(compgen -W "list add delete" -- "$cur") )
      return 0 ;;
    actions)
      COMPREPLY=( $(compgen -W "track get list validate" -- "$cur") )
      return 0 ;;
    action-configs)
      COMPREPLY=( $(compgen -W "list create get update delete" -- "$cur") )
      return 0 ;;
    rules)
      COMPREPLY=( $(compgen -W "list create get update delete" -- "$cur") )
      return 0 ;;
    tenant)
      COMPREPLY=( $(compgen -W "get update" -- "$cur") )
      return 0 ;;
    theme)
      COMPREPLY=( $(compgen -W "get update" -- "$cur") )
      return 0 ;;
    value-lists)
      COMPREPLY=( $(compgen -W "list create get update delete" -- "$cur") )
      return 0 ;;
    api)
      COMPREPLY=( $(compgen -W "GET POST PATCH DELETE" -- "$cur") )
      return 0 ;;
  esac

  if [ $COMP_CWORD -eq 1 ]; then
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
  fi
}
complete -F _authsignal_completions authsignal
###-end-authsignal-completions-###`;

const ZSH_COMPLETION = `#compdef authsignal

_authsignal() {
  local -a commands
  commands=(
    'config:Manage CLI configuration'
    'users:Manage users'
    'authenticators:Manage user authenticators'
    'actions:Track and query actions'
    'action-configs:Manage action configurations'
    'rules:Manage rules for action configurations'
    'tenant:Manage tenant configuration'
    'theme:Manage UI theme'
    'value-lists:Manage value lists for rules'
    'status:Show configuration and connectivity status'
    'completion:Generate shell completion scripts'
    'open:Open Authsignal pages in browser'
    'api:Make raw API requests'
    'help:Display help for command'
  )

  _arguments -C \\
    '(-o --output)'{-o,--output}'[Output format]:format:(json table plain)' \\
    '--region[API region]:region:(us au eu ca)' \\
    '--api-key[Server API key]:key:' \\
    '--management-key[Management API key]:key:' \\
    '(-q --quiet)'{-q,--quiet}'[Suppress non-essential output]' \\
    '(-y --yes)'{-y,--yes}'[Skip confirmation prompts]' \\
    '(-v --verbose)'{-v,--verbose}'[Show HTTP request details]' \\
    '--dry-run[Preview destructive operations]' \\
    '1:command:->command' \\
    '*::arg:->args'

  case "$state" in
    command)
      _describe 'command' commands ;;
    args)
      case $words[1] in
        config) _values 'subcommand' set get regions ;;
        users) _values 'subcommand' list get update delete ;;
        authenticators) _values 'subcommand' list add delete ;;
        actions) _values 'subcommand' track get list validate ;;
        action-configs) _values 'subcommand' list create get update delete ;;
        rules) _values 'subcommand' list create get update delete ;;
        tenant) _values 'subcommand' get update ;;
        theme) _values 'subcommand' get update ;;
        value-lists) _values 'subcommand' list create get update delete ;;
        api) _values 'method' GET POST PATCH DELETE ;;
        open) _values 'page' dashboard docs api-docs ;;
      esac ;;
  esac
}

_authsignal "$@"`;

const FISH_COMPLETION = `# Fish completions for authsignal
complete -c authsignal -n '__fish_use_subcommand' -a config -d 'Manage CLI configuration'
complete -c authsignal -n '__fish_use_subcommand' -a users -d 'Manage users'
complete -c authsignal -n '__fish_use_subcommand' -a authenticators -d 'Manage user authenticators'
complete -c authsignal -n '__fish_use_subcommand' -a actions -d 'Track and query actions'
complete -c authsignal -n '__fish_use_subcommand' -a action-configs -d 'Manage action configurations'
complete -c authsignal -n '__fish_use_subcommand' -a rules -d 'Manage rules'
complete -c authsignal -n '__fish_use_subcommand' -a tenant -d 'Manage tenant configuration'
complete -c authsignal -n '__fish_use_subcommand' -a theme -d 'Manage UI theme'
complete -c authsignal -n '__fish_use_subcommand' -a value-lists -d 'Manage value lists'
complete -c authsignal -n '__fish_use_subcommand' -a status -d 'Show status'
complete -c authsignal -n '__fish_use_subcommand' -a completion -d 'Generate shell completions'
complete -c authsignal -n '__fish_use_subcommand' -a open -d 'Open pages in browser'
complete -c authsignal -n '__fish_use_subcommand' -a api -d 'Make raw API requests'

complete -c authsignal -n '__fish_seen_subcommand_from config' -a 'set get regions'
complete -c authsignal -n '__fish_seen_subcommand_from users' -a 'list get update delete'
complete -c authsignal -n '__fish_seen_subcommand_from authenticators' -a 'list add delete'
complete -c authsignal -n '__fish_seen_subcommand_from actions' -a 'track get list validate'
complete -c authsignal -n '__fish_seen_subcommand_from action-configs' -a 'list create get update delete'
complete -c authsignal -n '__fish_seen_subcommand_from rules' -a 'list create get update delete'
complete -c authsignal -n '__fish_seen_subcommand_from tenant' -a 'get update'
complete -c authsignal -n '__fish_seen_subcommand_from theme' -a 'get update'
complete -c authsignal -n '__fish_seen_subcommand_from value-lists' -a 'list create get update delete'`;

export function registerCompletionCommand(parent: Command): void {
  parent
    .command("completion")
    .description("Generate shell completion scripts")
    .argument("[shell]", "Shell type: bash, zsh, fish (auto-detected from $SHELL)")
    .addHelpText(
      "after",
      `
Examples:
  authsignal completion bash >> ~/.bashrc
  authsignal completion zsh > ~/.zsh/completions/_authsignal
  authsignal completion fish > ~/.config/fish/completions/authsignal.fish

  # Auto-detect shell
  authsignal completion

Setup:
  Bash:  authsignal completion bash >> ~/.bashrc && source ~/.bashrc
  Zsh:   authsignal completion zsh > "${"\${fpath[1]}"}/_authsignal" && compinit
  Fish:  authsignal completion fish > ~/.config/fish/completions/authsignal.fish`,
    )
    .action(
      withErrorHandler(async (shell: unknown) => {
        let sh = String(shell || "").toLowerCase();

        // Auto-detect from $SHELL
        if (!sh && process.env.SHELL) {
          const s = process.env.SHELL;
          if (s.includes("zsh")) sh = "zsh";
          else if (s.includes("fish")) sh = "fish";
          else sh = "bash";
        }

        if (!sh) sh = "bash";

        switch (sh) {
          case "bash":
            console.log(BASH_COMPLETION);
            break;
          case "zsh":
            console.log(ZSH_COMPLETION);
            break;
          case "fish":
            console.log(FISH_COMPLETION);
            break;
          default:
            throw new Error(
              `Unsupported shell "${sh}".\n  Supported: bash, zsh, fish\n  Example: authsignal completion bash >> ~/.bashrc`,
            );
        }
      }),
    );
}
