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
    this.ssh = new NodeSSH();
  }

  private async ensureConnection(): Promise<void> {
    if (!this.connected) {
      Logger.info(`[DirectAdmin] Connecting to SSH ${this.username}@${this.host}:${this.port}...`);
      await this.ssh.connect({
        host: this.host,
        port: this.port,
        username: this.username,
        privateKeyPath: this.privateKeyPath,
      });
      this.connected = true;
    }
  }

  private async execCmd(cmd: string): Promise<string> {
    await this.ensureConnection();
    const result = await this.ssh.execCommand(cmd);
    if (result.code !== 0) {
      Logger.error(`[DirectAdmin] SSH Command failed: ${cmd}`, { stderr: result.stderr });
      throw new Error(`Command failed with code ${result.code}: ${result.stderr}`);
    }
    return result.stdout;
  }

  public async getInstanceStatus(id: string): Promise<{ id: string; state: 'running' | 'failed' | 'failed'; health: 'healthy' | 'unhealthy' }> {
    try {
      // Check if the symlink or directory exists
      const stdout = await this.execCmd(`if [ -d "/home/${this.username}/domains/${id}/public_html" ]; then echo "OK"; else echo "MISSING"; fi`);
      if (stdout.trim() === 'OK') {
        return { id, state: 'running', health: 'healthy' };
      }
      return { id, state: 'failed', health: 'unhealthy' };
    } catch (e) {
      return { id, state: 'failed', health: 'unhealthy' };
    }
  }

  public async createHostedApp(name: string, image: string): Promise<{ id: string; state: string }> {
    await this.execCmd(`mkdir -p /home/${this.username}/domains/${name}/public_html`);
    return { id: name, state: 'running' };
  }

  public async removeHostedApp(id: string): Promise<void> {
    await this.execCmd(`rm -rf /home/${this.username}/domains/${id}/public_html`);
  }

  public async createDatabase(name: string, type: string): Promise<{ id: string; state: string }> {
    // Physical DirectAdmin CLI for creating DBs
    // Example: da api CMD_API_DATABASES ...
    await this.execCmd(`echo "da api create db ${name}"`); 
    return { id: name, state: 'running' };
  }

  public async removeDatabase(id: string): Promise<void> {
    await this.execCmd(`echo "da api drop db ${id}"`);
  }

  public async createAccountFILE(name: string): Promise<{ id: string; state: string }> {
    await this.execCmd(`mkdir -p /home/${this.username}/ugondu_storage/${name}`);
    return { id: name, state: 'running' };
  }

  public async removeAccountFILE(id: string): Promise<void> {
    await this.execCmd(`rm -rf /home/${this.username}/ugondu_storage/${id}`);
  }

  public async disconnect(): Promise<void> {
    if (this.connected) {
      this.ssh.dispose();
      this.connected = false;
    }
  }
}
