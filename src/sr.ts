import { dir } from "console";
import * as readline from 'readline';
import * as fs from "fs";
import path from 'path';
const rl = readline.createInterface({//readl
    input: process.stdin,
    output: process.stdout,
});
const curentpath = process.cwd()
//const findstr = "本日[GetDateText]、ドイツの帝都ベルリンは核爆発に見舞われた。今大戦においても、これまでの戦役においても市街地は度々攻撃を受けたが、今回の被害に比べればそれらは霞んで見える。ベルリンが同程度に荒廃したのは三十年戦争以来であり、都市が当時に比べ成長していることを考慮した場合、今回の被害はあり得ない規模のように思われた。\n\nベルリン王宮は爆弾が計画していた爆心地から離れた位置で爆発したこともあって残存しているようであり、皇帝[From.From.Owner.GetLeader]はこの所業に憤慨しながらも生存していると噂されている。だが、[From.From.Owner.GetAdjective]の指導者達がいかに避難すべきであったかのかと、いかに死の灰から身を守れるのかは別の問題だ。"//検索したい文字列
class searchstrfromdir {

    private path: string;
    private extensions: string[];
    private fileoutresult: string[]
    private findstr: string;
    /**
     * 文字列検索のコンストラクタ
     * @param path 検索したいパス
     * @param extensions 検索するファイルのファイルパス 
     */
    constructor(path: string, extensions: string[], findstr: string) {

        this.path = path;
        this.extensions = extensions;
        this.fileoutresult = [];
        this.findstr = findstr;
    }
    searchall() {
        /**
         * 特定の文字列の特定の行を引っ張り出す
         * @param inputString 参照される文字列
         * @param lineNumber 参照したい番号
         * @returns 
         */
        function getLineByNumber(inputString: string, lineNumber: number): string | null {
            const lines = inputString.split('\n');

            if (lineNumber >= 1 && lineNumber <= lines.length) {
                // lineNumberが有効な範囲内の場合、対応する行を返す
                return lines[lineNumber - 1];
            } else {
                // lineNumberが無効な場合はnullを返す
                return null;
            }
        }
        /**
         * 特定の文字列から文字列を探し、行数を返す
         * @param targetString 参照される文字列
         * @param text 探したいテキスト
         * @returns 行番号
         */
        function searchLine(targetString: string, text: string): number[] {
            const lines: string[] = text.split('\n');
            const matchingLines: number[] = [];

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(targetString)) {
                    matchingLines.push(i + 1); // 行番号は1から始まるため+1する
                }
            }

            return matchingLines;
        }
        /**
         * パスをファイルの名前に変える
         * @param filePath 元になるパス
         * @returns ファイルの名前
         */
        function getFileNameFromPath(filePath: string): string | null {
            // バックスラッシュとスラッシュでパスを分割
            const pathSegments = filePath.split(/[\\/]/);

            // 配列の最後の要素がファイル名
            const fileName = pathSegments.pop();

            return fileName || null;
        }
        interface findobj { code: string | null, linenum: number | null }
        interface searchresult {
            filename: string
            filepath: string
            findobj: findobj[]
        }
        return new Promise<searchresult[]>((resolve) => {
            this.searchinternal(this.path, false)
                .then(() => {//ファイル検索結果
                    const res = this.fileoutresult
                    //console.log(res);
                    const promices = res.map((res) => {//ファイルごとにループ   
                        return new Promise<searchresult>((resolve) => {
                            const src = fs.readFileSync(res).toString();
                            const result = searchLine(this.findstr, src)
                            const filename = getFileNameFromPath(res)

                            if (filename) {
                                const findobj: findobj[] = result.map((lineres) => {
                                    return {
                                        code: getLineByNumber(src, lineres),
                                        linenum: lineres
                                    };
                                })



                                const returnobj: searchresult = {
                                    filename: filename,
                                    filepath: res,
                                    findobj: findobj
                                }
                                resolve(returnobj);
                            }
                        })
                    })
                    Promise.all(promices)
                        .then((resbuffer) => {//ファイル調査後
                            const res = resbuffer.filter((res) => {
                                return (res.findobj.length !== 0)
                            })//検出結果(文字列側)
                            resolve(res);
                        })
                })
        })
    }
    private searchinternal(path: string, iscallagain: boolean) {
        //  console.log(path);
        return new Promise<void>((resolve) => {
            const searchdirres = this.getAllSubdirectories(path);
            const searchfileres = this.getFilesWithExtensions(path);
            const dircheck = () => {//ディレクトリチェックをpromiceで
                return new Promise<void>((resolve) => {
                    if (searchdirres) {//サブディレクトリが存在する
                        const promices = searchdirres.map((res) => {//出てきたサブディレクトリでループ
                            return new Promise<void>((resolve) => {

                                this.searchinternal(res, true)//再帰処理で更に奥のファイルやサブディレクトリを掘る
                                    .then(() => {
                                        resolve();
                                    })
                            })
                        })
                        Promise.all(promices)//すべて解決するまで待つ
                            .then(() => {
                                resolve();
                            });
                    } else resolve();
                })
            }
            dircheck()
                .then(() => {
                    //次にファイルを掘る
                    if (searchfileres) {
                        //    console.log(searchdirres);
                        searchfileres.map(res => {
                            this.fileoutresult.push(res)//見つけたファイルのリストを追加
                        })
                    }
                    resolve();
                })

        })

    }

    private getAllSubdirectories(directoryPath: string): string[] | null {
        try {
            const subdirectories = fs.readdirSync(directoryPath, { withFileTypes: true });

            // サブディレクトリのみをフィルタリング
            const subdirectoryEntries = subdirectories.filter((entry) => entry.isDirectory());

            if (subdirectoryEntries.length > 0) {
                // サブディレクトリが存在する場合はそのディレクトリのパスを配列として返す
                return subdirectoryEntries.map((entry) => path.join(directoryPath, entry.name));
            } else {
                // サブディレクトリが存在しない場合はnullを返す
                return null;
            }
        } catch (error) {
            // エラーが発生した場合もnullを返す
            console.error('Error checking subdirectories:', error);
            return null;
        }
    }
    private getFilesWithExtensions(directoryPath: string): string[] | null {
        const extensions = this.extensions;
        try {
            const files = fs.readdirSync(directoryPath);

            // 指定された拡張子を持つファイルのみをフィルタリング
            const filteredFiles = files.filter((file) => {
                const fileName = path.basename(file);
                const ext = path.extname(file).toLowerCase();
                return extensions.includes(ext) && !fileName.includes('検索結果');
            });

            if (filteredFiles.length > 0) {
                // 指定された拡張子を持つファイルが存在する場合はそのパスを配列として返す
                return filteredFiles.map((file) => path.join(directoryPath, file));
            } else {
                // 指定された拡張子を持つファイルが存在しない場合はnullを返す
                return null;
            }
        } catch (error) {
            // エラーが発生した場合もnullを返す
            console.error('Error checking files:', error);
            return null;
        }
    }

}

//debug
/**
 * 標準入力を受け取る関数
 * @returns 入力内容
 */
function getInputFromConsole(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (input) => {
            resolve(input);
        });
    });
}
async function main() {
    const userInput = await getInputFromConsole("検索したい文字列を入力してください。");

    console.log(curentpath)
    const cli = new searchstrfromdir(curentpath, [".txt", ".yml"], userInput);
    cli.searchall()
        .then((res) => {

            let serchreslut: string = "";
            console.log("検索結果");
            res.map(res => {
                serchreslut += "--------------------------------------------------------\n";
                serchreslut += ("ファイル名:" + res.filename + "\n" + "ファイルパス:" + res.filepath)
                res.findobj.map(res => {
                    serchreslut += ("\n行番号:" + res.linenum + "\n内容:" + res.code + "\n");
                })
                serchreslut += ("\n\n\n\n\n");
            })
            console.log(serchreslut)
            setTimeout(async () => {
                const datecli = new Date();
                const filename = curentpath + "\\検索結果." + datecli.getHours() + "時" + datecli.getMinutes() + "分#" + datecli.getMonth() + "月" + datecli.getDate() + "日.txt"
                fs.writeFileSync(filename, serchreslut.toString())
                await getInputFromConsole("やることやったので終了します。:[ENTER]");
                rl.close();
            }, 1000);

        })
}
main();
