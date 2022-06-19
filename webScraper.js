 // TODO:
 // 1. determine max pages
 // 2. get filter target url
 // 3. dynamic url
 // 4. get all links
 // 5. individual page
 // 6. multiprocessing
 // 7. final data
const fs = require('fs')

 const puppeteer = require('puppeteer');


// launch browser

 const launchBrowser = async (url) => {

     try{
           //create browser
          const browser = await puppeteer.launch({headless : true});
          //create a new page
          const page = await browser.newPage();
          // tell the page to load the url
          await page.goto(url);

          return {page,browser}
     } catch (e) {
         console.log("Error on launchBrowser function ", e)
     }

 }

  const getMaxPages = async (page) => {
         try{

          // get maximum pages
          return await page.$eval(
              ".carlist_pager > ul:nth-child(1)",
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
             const stockIDs= await page.$$eval('div.car_image_area > p', links => links.map(link => link.textContent.trim().split(" ")[2] ));
             console.log("stock ids", stockIDs);
             // save stock ids
              allStockIDs.push(...stockIDs)
             //finish
             console.log("Moving to the next page ")

            fs.writeFile('stockIds.txt', `${allStockIDs}`, function (err) {
              if (err) return console.log("Error while writing to file " , err);
              console.log(`Page ${i} stock IDS saved to file`);
            });
         }
            console.log("All stock ids", allStockIDs)

       } catch (e) {
         console.log("Error on getStockIds function ", e)
     }
}

const main = async () => {
     try{
         const url = "https://www.sbtjapan.com/used-cars/?make=toyota&model=vitz&steering=all&type=0&sub_body_type=0&drive=0&year_f=2016&cc_f=0&cc_t=0&mile_f=0&mile_t=0&trans=0&savel=0&saveu=0&fuel=0&color=0&bodyLength=0&loadClass=0&engineType=0&location=0&port=0&search_box=1&locationIds=0&d_country=26&d_port=52&ship_type=0&FreightChk=yes&currency=2&inspection=yes&insurance=1&sort=46#listbox"

         const {page,browser} = await launchBrowser(url)
         const maxPages = await getMaxPages(page)
         console.log("Max pages", maxPages)
         await getStockIds(maxPages,page)
         await browser.close()

     } catch (e) {
         console.log("Error on main function ", e)
     }
}

main()