import { __t } from '@ugondu/shared';
import { NodeSSH } from 'node-ssh';
import { IDirectAdminClient } from './directadmin';
import { Logger } from '@ugondu/shared';

export class DirectAdminNativeClient implements IDirectAdminClient {
  private ssh: NodeSSH;
  private connected = false;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly username: string,
    private readonly privateKeyPath: string
  ) {
    this.validatePathSegment(username, 'username');
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(__t('messages.error.directadmin_invalid_ssh_port'));
    }
    this.ssh = new NodeSSH();
  }

  private async ensureConnection(): Promise<void> {
    if (!this.connected) {
      Logger.info(__t('directadmin_connecting_ssh', { username: this.username, host: this.host, port: this.port }));
      await this.ssh.connect({
        host: this.host,
        port: this.port,
        username: this.username,
        privateKeyPath: this.privateKeyPath,
      });
      this.connected = true;
    }
  }


  private escapeShell(val: string): string {
    return "'" + val.replace(/'/g, "'\\''") + "'";
  }

  /**
   * Validate untrusted identifiers before inserting them into filesystem paths.
   * Shell quoting alone does not prevent path traversal through ../ segments.
   */
  private validatePathSegment(value: string, label: string): string {
    if (
      typeof value !== 'string' ||
      value.length === 0 ||
      value.length > 128 ||
      value === '.' ||
      value === '..' ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
    ) {
      throw new Error(__t('messages.error.directadmin_invalid_path_identifier', { label }));
    }
    return value;
  }

  private validateHostedAppName(value: string): string {
    // Arbitrary image/container execution is not supported by a shared-host
    // mkdir adapter. Only a safe domain/app folder identifier is accepted.
    return this.validatePathSegment(value, 'hosted_app_name');
  }

  private async execCmd(cmd: string): Promise<string> {
    await this.ensureConnection();
    const result = await this.ssh.execCommand(cmd);
    if (result.code !== 0) {
      Logger.error(__t('directadmin_ssh_command_failed', { cmd }), { stderr: result.stderr });
      throw new Error(__t('directadmin_command_failed_code_stderr', { code: result.code, stderr: result.stderr }));
    }
    return result.stdout;
  }

  public async getInstanceStatus(id: string): Promise<{ id: string; state: 'running' | 'failed'; health: 'healthy' | 'unhealthy' }> {
    const safeId = this.validatePathSegment(id, 'instance_id');
    // Directory presence proves only that files exist. Until an application
    // health probe is configured, never claim an application is running.
    const stdout = await this.execCmd(`if [ -d /home/${this.escapeShell(this.username)}/domains/${this.escapeShell(safeId)}/public_html ]; then echo "PRESENT"; else echo "MISSING"; fi`);
    if (stdout.trim() === 'PRESENT') {
      return { id: safeId, state: 'failed', health: 'unhealthy' };
    }
    return { id: safeId, state: 'failed', health: 'unhealthy' };
  }

  public async createHostedApp(name: string, image: string): Promise<{ id: string; state: string }> {
    this.validateHostedAppName(name);
    // This adapter does not deploy an application image: creating a directory
    // is not equivalent to installing, starting or qualifying that application.
    throw new Error(__t('messages.error.directadmin_hosted_app_deployment_unqualified', { name }));
  }

  public async removeHostedApp(id: string): Promise<void> {
    const safeId = this.validatePathSegment(id, 'instance_id');
    await this.execCmd(`rm -rf -- /home/${this.escapeShell(this.username)}/domains/${this.escapeShell(safeId)}/public_html`);
  }

  public async createDatabase(name: string, type: string): Promise<{ id: string; state: string }> {
    const safeName = this.validatePathSegment(name, 'database_name');
    if (type !== 'mysql' && type !== 'mariadb') {
      throw new Error(__t('messages.error.directadmin_database_engine_unsupported', { type }));
    }
    await this.execCmd(`da api create db ${this.escapeShell(safeName)}`);
    return { id: safeName, state: 'running' };
  }

  public async removeDatabase(id: string): Promise<void> {
    const safeId = this.validatePathSegment(id, 'database_id');
    await this.execCmd(`da api drop db ${this.escapeShell(safeId)}`);
  }

  public async createAccountFILE(name: string): Promise<{ id: string; state: string }> {
    const safeName = this.validatePathSegment(name, 'storage_name');
    await this.execCmd(`mkdir -p -- /home/${this.escapeShell(this.username)}/ugondu_storage/${this.escapeShell(safeName)}`);
    return { id: safeName, state: 'running' };
  }

  public async removeAccountFILE(id: string): Promise<void> {
    const safeId = this.validatePathSegment(id, 'storage_id');
    await this.execCmd(`rm -rf -- /home/${this.escapeShell(this.username)}/ugondu_storage/${this.escapeShell(safeId)}`);
  }

  public async createSnapshot(req: any): Promise<string> {
    if (!req || typeof req.resourceId !== 'string') {
      throw new Error(__t('messages.error.directadmin_invalid_snapshot_resource'));
    }
    const id = this.validatePathSegment(req.resourceId, 'snapshot_resource_id');
    const snapName = `snap-${id}-${Date.now()}.tar.gz`;
    await this.execCmd(`mkdir -p -- /home/${this.escapeShell(this.username)}/admin_backups; tar -czf /home/${this.escapeShell(this.username)}/admin_backups/${this.escapeShell(snapName)} -C /home/${this.escapeShell(this.username)}/domains/${this.escapeShell(id)} public_html`);
    return snapName;
  }

  public async disconnect(): Promise<void> {
    if (this.connected) {
      this.ssh.dispose();
      this.connected = false;
    }
  }
}

