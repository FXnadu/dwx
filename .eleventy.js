module.exports = function (eleventyConfig) {
  // 复制静态资源到输出目录
  eleventyConfig.addPassthroughCopy("src/assets");

  // 注册 Nunjucks 自定义过滤器
  eleventyConfig.addNunjucksFilter("year", function () {
    return new Date().getFullYear().toString();
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
