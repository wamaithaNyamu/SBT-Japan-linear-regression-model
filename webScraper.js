 // TODO:
 // 1. determine max pages
 // 2. get filter target url
 // 3. dynamic url
 // 4. get all links
 // 5. individual page
 // 6. multiprocessing
 // 7. final data
//  8. Refactor all the code to use puppeteer cluster
const fs = require('fs')

const puppeteer = require('puppeteer');
const { Cluster } = require('puppeteer-cluster');

// launch browser
const launchBrowser = async (url) => {

     try{
           //create browser
          const browser = await puppeteer.launch({headless : true});
          //create a new page
          const page = await browser.newPage();
          // tell the page to load the url
          await page.goto(url);
          //  return the page and browser
          return {page,browser}
     } catch (e) {
         console.log("Error on launchBrowser function ", e)
     }

 }
 const getMaxPages = async (page) => {
         try{

          // get maximum pages
          return await page.$eval(
              ".carlist_pager > ul",
              (ul) => {
                  const pagesArray = [];
                  for (let i = 0; i < ul.children.length; i++) {
                      pagesArray.push(ul.children[i].textContent);
                  }
                  return parseInt(pagesArray[pagesArray.length - 2]);
              }
          )


     } catch (e) {
         console.log("Error on main function ", e)
     }
}

const getStockIds = async (maxPages,page) => {
     try{
         console.log("The maximum pages for stock ids",maxPages)
         const allStockIDs = []

         for (let i =1; i <= maxPages; i++){
             console.log("page  : ", i)
             // navigate to page
             await page.goto(`https://www.sbtjapan.com/used-cars/toyota/vitz/?steering=all&drive=0&year_f=2016&month_f=1&cc_f=0&cc_t=0&mile_f=0&mile_t=0&trans=0&savel=0&saveu=0&fuel=0&color=0&bodyLength=0&loadClass=0&engineType=0&location=&port=0&search_box=1&locationIds=0&d_country=26&d_port=52&ship_type=0&FreightChk=yes&currency=2&inspection=yes&insurance=1&sort=1&p_num=${i}#listbox`)
             // get stock ids

             const stockIDs= await page.$$eval('div.car_image_area > p', stockIDS => stockIDS.map(stockID => stockID.textContent.trim().split(" ")[2] ));
             console.log("stock ids", stockIDs);
             // save stock ids
              allStockIDs.push(...stockIDs)
             //finish
             console.log("Moving to the next page ")

            fs.writeFile('stockIds.txt', `${allStockIDs}`, function (err) {
              if (err) return console.log("Error while writing to file " , err);
              console.log(`Page ${i}/${maxPages} stock IDS saved to file`);
            });
         }
            console.log("All stock ids", allStockIDs)
        return page
       } catch (e) {
         console.log("Error on getStockIds function ", e)
     }
}

const carDetails = async (page,stockID) => {
     try{
        // get car details - css selector for the title
         const title =  await page.$eval("#contents_detail > div.content > ul > li:nth-child(2) > h1", title => title.innerText);
         console.log(title);
         // table head
        const th = await page.$$eval('table.tabA:nth-child(2) tr th', ths => ths.map((th) => {
          return th.innerText;
        }));
        // console.log("------------------------------Table Head-----------------------------------")
        // console.log(th);

        // table data (actual details)
        const td = await page.$$eval('table.tabA:nth-child(2) tr td', tds => tds.map((td) => {
          return td.innerText;
        }));
        // console.log("------------------------------Table Data-----------------------------------")
        // console.log(td);

         // get options
         //get accessories
         // accessories table data (actual details)
        const tdAccessories = await page.$$eval('#contents_detail > div.content > div.contentLeft > div.carDetails > table.accesories tr td', tds => tds.map((td) => {
          return td.innerText;
        }));

        // console.log("------------------------------Accessories Table Data-----------------------------------")
        // console.log(tdAccessories)
       const tdAccessoriesAbsent = await page.$$eval('#contents_detail > div.content > div.contentLeft > div.carDetails > table.accesories tr td.back', tds => tds.map((td) => {
          return td.innerText;
        }));

        // console.log("------------------------------Accessories Absent Table Data-----------------------------------")
        // console.log(tdAccessoriesAbsent)
       // get accessories only present in tdAccessories
       //  The filter() method creates a new array filled with elements that pass a test provided by a function.
       const tdAccessoriesPresent = tdAccessories.filter(accessory => !tdAccessoriesAbsent.includes(accessory))
       // console.log("------------------------------Accessories Present Table Data-----------------------------------")
       // console.log(tdAccessoriesPresent)

       // get price
       const price =  await page.$eval('#total_cost', el => el.innerText);
       console.log(price);
       console.log(`The length of the td is ${td.length} and length of th is ${th.length}`)
       // make object of th and td
       const td_th = {}
       th.forEach((element, index) => {
          td_th[element] = td[index];
        });

       const accessories = {}
       tdAccessoriesPresent.forEach((element, index) => {
          accessories[element] = true;
        });

       const details= {
                'title':title,
                ...td_th,
                ...accessories,
               'price': price

       }
       console.log("detaills",details)
       // create file if doesnt exist
       if (!fs.existsSync('CAR_DETAILS')){

            fs.mkdirSync('CAR_DETAILS');
            console.log("Created folder")
        }
         fs.writeFile(`./CAR_DETAILS/${stockID}.json`, JSON.stringify(details), function (err) {
              if (err) return console.log("Error while writing to file " , err);
              console.log(`${stockID} car details saved to file`);
            });
     }catch (e) {
         console.log("Error on carDetails function ", e)
     }
}


const getEachCarDetailsConcurrently = async () => {
     try{
      // https://www.sbtjapan.com/used-cars/toyota/vitz/WF9238/

      // get all stock ids from file
         const stockIDFromTXT = fs.readFileSync("./stockIds.txt").toString().split(",");
         const allLinks = []

         for(let stockId in stockIDFromTXT){
            // make sure stock id is there
            !!stockIDFromTXT[stockId] && allLinks.push(`https://www.sbtjapan.com/used-cars/toyota/vitz/${stockIDFromTXT[stockId]}`)
         }

         const maxBrowsers = 5

         const divideLinks = []
         //slice array into subarrays. Last index is not included in slice
         for (let i = 0; i < allLinks.length; i += maxBrowsers) {
                const subLinks = allLinks.slice(i, i + maxBrowsers)
             divideLinks.push(subLinks)
         }

      // get each car concurrently
      // Create a cluster with 5 workers
        const cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: maxBrowsers,
             puppeteerOptions: {
                headless: true,
                args: [`--window-size=${1680},${1000}`],
              },
        });

        // Define a task (in this case: screenshot of page)
        await cluster.task(async ({ page, data: url }) => {
            console.log("Starting on ", url)
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setRequestInterception(true);
            // prevent images from loading
            page.on('request', (req) => {
                if(req.resourceType() === 'image'){
                    req.abort();
                }
                else {
                    req.continue();
                }
            });

            await page.goto(url);
            const stockID = url.split('/').pop()
            await carDetails(page,stockID)
            console.log("Done on ", url)
        });


        for (let i = 0; i <= divideLinks.length -1 ; i++) {

              //  for (let i = 0; i <= 3 ; i++) {
                    console.log(`-------------------------------- ${i}/ ${divideLinks.length - 1}----------------------------------------------`)
                    // Add some pages to queue
                    for (let j = 0; j<= divideLinks[i].length -1 ; j++)  {
                        await cluster.queue(divideLinks[i][j]);
                    }

                   // Shutdown cluster after everything is done
                    await cluster.idle();
                    await cluster.close();
        }

        return true
     }catch (e) {
            console.log("Error on getEachCarDetails function ", e)
     }
}

const mergeJsonFiles = async () => {
     try{
         const allJsons = []
         //read everything in the car details  folder
         fs.readdir('./CAR_DETAILS', (err, files) => {
         files.forEach(file => {
                const detailsFromFile = fs.readFileSync(`./CAR_DETAILS/${file}`);
                const jsonData = JSON.parse(detailsFromFile);
                allJsons.push(jsonData)
          }
        )
          fs.writeFile(`final.json`, JSON.stringify(allJsons), function (err) {
              if (err) return console.log("Error while writing to file " , err);
              console.log(`All car details saved to file`);
            });
         });

     }catch (e) {
          console.log("Error on mergeJsonFiles function ", e)
     }
}


const main = async () => {
     try{

          const url = "https://www.sbtjapan.com/used-cars/?make=toyota&model=vitz&steering=all&type=0&sub_body_type=0&drive=0&year_f=2016&cc_f=0&cc_t=0&mile_f=0&mile_t=0&trans=0&savel=0&saveu=0&fuel=0&color=0&bodyLength=0&loadClass=0&engineType=0&location=0&port=0&search_box=1&locationIds=0&d_country=26&d_port=52&ship_type=0&FreightChk=yes&currency=2&inspection=yes&insurance=1&sort=46#listbox"
         const {page,browser} = await launchBrowser(url)
         const maxPages = await getMaxPages(page)
         await getStockIds(maxPages,page)
         await browser.close()
         // start of puppeteer cluster
         await getEachCarDetailsConcurrently()
         await mergeJsonFiles()

     } catch (e) {
         console.log("Error on main function ", e)
     }
}

console.time('Time Taken');
main().then(()=> console.timeEnd('Time Taken'))

